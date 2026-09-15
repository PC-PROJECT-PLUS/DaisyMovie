import { Component, signal, inject, AfterViewInit, effect, computed } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ResponsiveService } from '../../services/responsive';
import { NavbarMobile } from './navbar-mobile/navbar-mobile';
import { CategoryService } from '../../services/category.service';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';
import { NotificationService, AppNotification } from '../../services/notification.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarMobile],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar implements AfterViewInit {
  public responsiveService = inject(ResponsiveService);
  private router = inject(Router);
  public themeService = inject(ThemeService);
  public categoryService = inject(CategoryService);
  private titleService = inject(Title);
  public authService = inject(AuthService);
  public notificationService = inject(NotificationService);
  activeProfile = computed(() => this.authService.selectedProfile());

  isSearchExpanded = signal<boolean>(false);
  searchQuery = signal<string>('');
  isUserMenuOpen = signal<boolean>(false);
  isNotificationMenuOpen = signal<boolean>(false);

  unreadCount = computed(() => this.notificationService.notifications().filter(n => n.unread).length);

  navItems = ['Film', 'Serie TV', 'Animazione', 'Anime'];

  indicatorStyle = signal({ left: '0px', width: '32px' });
  hasInitialized = false;

  constructor() {
    effect(() => {
      // Whenever category changes, update indicator
      const current = this.categoryService.activeCategory();
      setTimeout(() => this.updateIndicator(), 50);
    });
  }

  ngAfterViewInit() {
    setTimeout(() => this.updateIndicator(), 100);
  }

  updateIndicator() {
    if (typeof document === 'undefined') return;
    const tabs = document.querySelectorAll('.nav-item');
    const activeIndex = this.navItems.indexOf(this.categoryService.activeCategory());
    if (activeIndex >= 0 && tabs[activeIndex]) {
      const target = tabs[activeIndex] as HTMLElement;
      if (target) {
        this.indicatorStyle.set({
          left: target.offsetLeft + 'px',
          width: target.offsetWidth + 'px'
        });
        if (!this.hasInitialized) {
          setTimeout(() => this.hasInitialized = true, 50);
        }
      }
    }
  }

  setActiveTab(tab: string) {
    this.categoryService.setCategory(tab);
    if (this.router.url !== '/') {
      this.router.navigate(['/']);
    }
  }

  onLogoClick() {
    const category = this.categoryService.activeCategory();
    this.titleService.setTitle(`DaisyMovie - ${category}`);
    if (this.router.url !== '/') {
      this.router.navigate(['/']);
    }
  }

  getLogoText(): string {
    const category = this.categoryService.activeCategory();
    if (category === 'Serie TV') return 'SerieTV';
    if (category === 'Animazione') return 'Animazione';
    if (category === 'Anime') return 'Anime';
    return 'Movie';
  }

  getLogoWidth(): string {
    const category = this.categoryService.activeCategory();
    if (category === 'Serie TV') return '135px';
    if (category === 'Animazione') return '190px';
    if (category === 'Anime') return '125px';
    return '125px'; // Movie
  }

  toggleSearch() {
    this.isSearchExpanded.update(v => !v);
  }

  onSearchFocus() {
    this.isSearchExpanded.set(true);
  }

  onSearchBlur() {
    this.isSearchExpanded.set(false);
  }

  onSearchEnter() {
    const q = this.searchQuery().trim();
    if (q) {
      this.router.navigate(['/search'], { queryParams: { q } });
    }
  }

  setTheme(theme: 'dark' | 'light' | 'dynamic') {
    this.themeService.setTheme(theme);
  }

  toggleUserMenu(state?: boolean) {
    if (state !== undefined) {
      this.isUserMenuOpen.set(state);
    } else {
      this.isUserMenuOpen.update(v => !v);
    }
    if (this.isUserMenuOpen()) {
      this.isNotificationMenuOpen.set(false);
    }
  }

  toggleNotificationMenu(state?: boolean) {
    if (state !== undefined) {
      this.isNotificationMenuOpen.set(state);
    } else {
      this.isNotificationMenuOpen.update(v => !v);
    }
    if (this.isNotificationMenuOpen()) {
      this.isUserMenuOpen.set(false);
    }
  }

  onNotificationClick(notif: AppNotification) {
    this.notificationService.markAsRead(notif.id);
    this.isNotificationMenuOpen.set(false);
    if (notif.targetUrl) {
      this.router.navigate([notif.targetUrl]);
    }
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  get hasUnreadNotifications(): boolean {
    return this.unreadCount() > 0;
  }

  logout() {
    this.authService.showLogoutModal.set(true);
    this.isUserMenuOpen.set(false);
  }
}
