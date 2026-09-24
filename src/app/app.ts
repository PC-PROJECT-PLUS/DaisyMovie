import { Component, signal, inject, computed, PLATFORM_ID, AfterViewInit, OnDestroy, effect } from '@angular/core';
import { RouterOutlet, Router, Event as RouterEvent, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Navbar } from './components/navbar/navbar';
import { PageLoaderComponent } from './components/page-loader/page-loader';
import { LogoutModalComponent } from './components/shared/logout-modal/logout-modal';
import { CollectionsModalComponent } from './components/collections-modal/collections-modal';
import { LoaderService } from './services/loader.service';
import { AuthService } from './services/auth.service';
import { PreferencesService } from './services/preferences.service';
import { filter } from 'rxjs/operators';

// Routes where the navbar should be hidden
const HIDDEN_NAVBAR_ROUTES = ['/auth', '/profile'];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, CommonModule, PageLoaderComponent, LogoutModalComponent, CollectionsModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit, OnDestroy {
  protected readonly title = signal('DaisyMovie');
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  public loaderService = inject(LoaderService);
  public auth = inject(AuthService);
  public preferencesService = inject(PreferencesService);

  showNavbar = signal(true);
  private minLoadingTime: number = 0;

  private observer: MutationObserver | null = null;
  private pendingImages = new Set<HTMLImageElement>();
  private failsafeTimeout: any;

  constructor() {
    this.router.events.subscribe((event: RouterEvent) => {
      this.checkRouterEvent(event);
    });

    // Automatically check if we can hide loader when route marks itself ready
    effect(() => {
      if (this.loaderService.isRouteReady()) {
        this.checkIfDone();
      }
    });

    // Apply global CSS variables from preferences
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      
      const root = document.documentElement;
      
      // Theme
      root.setAttribute('data-theme', this.preferencesService.theme());
      
      // Colors
      const secColor = this.preferencesService.secondaryColor();
      if (secColor === 'yellow') {
        root.style.setProperty('--accent-secondary', '#eab308');
        root.style.setProperty('--accent-secondary-glow', 'rgba(234, 179, 8, 0.4)');
      } else if (secColor === 'orange') {
        root.style.setProperty('--accent-secondary', '#f97316');
        root.style.setProperty('--accent-secondary-glow', 'rgba(249, 115, 22, 0.4)');
      } else if (secColor === 'red') {
        root.style.setProperty('--accent-secondary', '#ef4444');
        root.style.setProperty('--accent-secondary-glow', 'rgba(239, 68, 68, 0.4)');
      }

      // Glass settings
      root.style.setProperty('--glass-blur-amount', `${this.preferencesService.glassBlur()}px`);
      root.style.setProperty('--glass-bg-opacity', `${this.preferencesService.glassOpacity() / 100}`);
      
      root.style.setProperty('--popup-glass-blur', `${this.preferencesService.popupGlassBlur()}px`);
      root.style.setProperty('--popup-glass-opacity', `${this.preferencesService.popupGlassOpacity() / 100}`);
    });
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.setupImageObserver();
    }
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private setupImageObserver() {
    this.observer = new MutationObserver((mutations) => {
      if (!this.loaderService.isPageLoading()) return;

      mutations.forEach(mutation => {
        mutation.addedNodes.forEach((node: any) => {
          if (node.nodeType === 1) { // ELEMENT_NODE
            const element = node as HTMLElement;
            if (element.tagName === 'IMG') {
              this.trackImage(element as HTMLImageElement);
            }
            if (element.querySelectorAll) {
              element.querySelectorAll('img').forEach((img: any) => this.trackImage(img));
            }
          }
        });
      });
    });

    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  private trackImage(img: HTMLImageElement) {
    // If it's already complete or it's a lazy image, don't wait for it unless it's critical
    if (img.complete || img.loading === 'lazy') return;

    this.pendingImages.add(img);
    const onLoad = () => {
      this.pendingImages.delete(img);
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onLoad);
      this.checkIfDone();
    };
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onLoad);
  }

  private checkIfDone() {
    if (this.pendingImages.size === 0 && this.loaderService.isRouteReady()) {
      this.loaderService.isPageLoading.set(false);
      clearTimeout(this.failsafeTimeout);
    }
  }

  private checkRouterEvent(event: RouterEvent): void {
    if (event instanceof NavigationStart) {
      this.pendingImages.clear();
      this.loaderService.startNavigation();
      this.minLoadingTime = Date.now();

      clearTimeout(this.failsafeTimeout);
      this.failsafeTimeout = setTimeout(() => {
        // Failsafe: if after 5 seconds it's still loading, force hide it
        this.pendingImages.clear();
        this.loaderService.isPageLoading.set(false);
      }, 5000);
    }

    if (event instanceof NavigationEnd ||
      event instanceof NavigationCancel ||
      event instanceof NavigationError) {

      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects;
        this.showNavbar.set(
          !HIDDEN_NAVBAR_ROUTES.some(r => url.startsWith(r))
        );
      }

      // Wait for components to signal route ready
      this.checkIfDone();
    }
  }
}
