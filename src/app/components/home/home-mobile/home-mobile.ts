import { Component, signal, OnDestroy, OnInit, AfterViewInit, inject, PLATFORM_ID, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import { CategoryService } from '../../../services/category.service';
import { HeroMovie, ContinueWatchingItem, MovieItem, LatestEpisodeItem, TopWatchedItem, DetailedMovieItem, globalColorCache } from '../home';

@Component({
  selector: 'app-home-mobile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home-mobile.html',
  styleUrl: './home-mobile.scss'
})
export class HomeMobile implements OnInit, AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private categoryService = inject(CategoryService);
  private sanitizer = inject(DomSanitizer);
  private isBrowser = isPlatformBrowser(this.platformId);

  activeTheme = signal<'dark' | 'light' | 'dynamic'>('dark');
  dynamicBgColor = signal<string>('rgba(138, 43, 226, 0.35)');

  currentHeroIndex = signal<number>(0);
  heroButtonColor = signal<string>('#c026d3');
  private heroInterval: any;

  // Dynamic Edge Fade Signals for Slider Scroll State
  canScrollRightContinue = signal<boolean>(true);
  canScrollLeftContinue = signal<boolean>(false);

  canScrollRightTrending = signal<boolean>(true);
  canScrollLeftTrending = signal<boolean>(false);

  canScrollRightEpisodes = signal<boolean>(true);
  canScrollLeftEpisodes = signal<boolean>(false);

  canScrollRightNewReleases = signal<boolean>(true);
  canScrollLeftNewReleases = signal<boolean>(false);

  canScrollRightAcclaimed = signal<boolean>(true);
  canScrollLeftAcclaimed = signal<boolean>(false);

  canScrollRightSpotlight = signal<boolean>(true);
  canScrollLeftSpotlight = signal<boolean>(false);

  canScrollRightComingSoon = signal<boolean>(true);
  canScrollLeftComingSoon = signal<boolean>(false);

  canScrollRightHiddenGems = signal<boolean>(true);
  canScrollLeftHiddenGems = signal<boolean>(false);

  canScrollRightTopPicks = signal<boolean>(true);
  canScrollLeftTopPicks = signal<boolean>(false);

  canScrollRightActionMovies = signal<boolean>(true);
  canScrollLeftActionMovies = signal<boolean>(false);

  @Input() heroMovies: HeroMovie[] = [];
  @Input() continueWatchingList: ContinueWatchingItem[] = [];
  @Input() trendingMovies: MovieItem[] = [];
  @Input() latestEpisodes: LatestEpisodeItem[] = [];
  @Input() newReleasesMovies: MovieItem[] = [];
  @Input() topWatchedMovies: TopWatchedItem[] = [];
  @Input() spotlightMovies: DetailedMovieItem[] = [];
  @Input() comingSoonMovies: MovieItem[] = [];
  @Input() hiddenGemsMovies: MovieItem[] = [];
  @Input() topPicksMovies: MovieItem[] = [];
  @Input() actionMovies: MovieItem[] = [];
  @Input() isPageLoaded: boolean = false;
  @Input() isHidden: boolean = false;

  @Output() themeChange = new EventEmitter<'dark' | 'light' | 'dynamic'>();

  showAllCharts = signal<boolean>(false);

  // ─── TOUCH EVENTS STATE ──────────────────────────────────────────────────────
  private touchStartX = 0;
  private touchEndX = 0;

  // ─── HOVER PANEL STATE ───────────────────────────────────────────────────────
  /** The movie currently displayed in the hover panel (kept even during exit animation) */
  panelMovie = signal<MovieItem | null>(null);
  /** Extracted dominant color of the currently shown panel poster */
  panelAccentColor = signal<string>('#0075ff');
  /** Whether the panel is visible (drives CSS transition) */
  isPanelVisible = signal<boolean>(false);
  /** Fixed-position coordinates for the panel */
  panelPos = signal<{ top: number; left: number }>({ top: -2000, left: -2000 });

  /** Whether the panel is in its fast-exit phase when switching between cards */
  isPanelSwitching = signal<boolean>(false);

  // Global overlay for episode card glow (escapes scroll clipping)
  episodeGlow = signal<{ top: number, left: number, width: number, height: number, color: string, isHovered: boolean }>({
    top: 0, left: 0, width: 0, height: 0, color: '', isHovered: false
  });

  private episodeGlowHideTimer: any = null;
  /** Last known mouse position — used to re-check glow after slider scrolls */
  private lastMouseX = 0;
  private lastMouseY = 0;

  onEpisodeEnter(event: MouseEvent, color: string) {
    // Cancel any pending hide so rapid card-to-card moves don't flicker
    if (this.episodeGlowHideTimer) {
      clearTimeout(this.episodeGlowHideTimer);
      this.episodeGlowHideTimer = null;
    }

    const target = event.currentTarget as HTMLElement;
    const slider = target.closest('.episodes-slider') as HTMLElement;
    // Get original position before transform moves it
    const rect = target.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(target);
    const transform = computedStyle.transform;

    // Check if card is inside the visible (non-faded) zone of the slider
    // The fade gradient is now 200px wide, so use 160px as the safe threshold
    if (slider) {
      const sliderRect = slider.getBoundingClientRect();
      const scrollLeft = slider.scrollLeft;
      const maxScroll = slider.scrollWidth - slider.clientWidth;
      const leftThreshold = scrollLeft > 5 ? sliderRect.left + 160 : sliderRect.left - 1;
      const rightThreshold = scrollLeft < maxScroll - 5 ? sliderRect.right - 160 : sliderRect.right + 1;
      if (rect.left < leftThreshold || rect.right > rightThreshold) {
        return; // Don't show glow if card is behind fade gradient
      }
    }

    let originalTop = rect.top;
    if (transform && transform !== 'none') {
      const matrix = new DOMMatrix(transform);
      originalTop -= matrix.m42; // subtract translateY
    }

    this.episodeGlow.set({
      top: originalTop,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      color: color,
      isHovered: true
    });
  }

  onEpisodeLeave() {
    // Cancel any existing timer before starting a new one (prevents stale timers during scroll)
    if (this.episodeGlowHideTimer) {
      clearTimeout(this.episodeGlowHideTimer);
    }
    // 60ms grace window: if mouseenter fires on another card before this runs, hide is cancelled
    this.episodeGlowHideTimer = setTimeout(() => {
      this.episodeGlow.update(glow => ({ ...glow, isHovered: false }));
      this.episodeGlowHideTimer = null;
    }, 60);
  }

  private hideTimer: any = null;
  private showTimer: any = null;
  private switchTimer: any = null;
  /** Cleanup for the global capture-phase scroll listener */
  private globalScrollCleanup: (() => void) | null = null;
  /** The ID of the slider that is currently showing the hover panel */
  private activeSliderId: string | null = null;
  /** Cleanup function for the non-passive wheel listener on the hover panel */
  private panelWheelCleanup: (() => void) | null = null;

  readonly PANEL_W = 500;
  readonly PANEL_H = 350;

  onPosterMouseEnter(movie: MovieItem, event: MouseEvent) {
    if (!this.isBrowser) return;

    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
    if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = null; }
    if (this.switchTimer) { clearTimeout(this.switchTimer); this.switchTimer = null; }

    const card = event.currentTarget as HTMLElement;
    const sliderParent = card.closest('[id$="-slider"]');
    this.activeSliderId = sliderParent ? sliderParent.id : null;

    /** Compute panel position from card's current bounding rect */
    const calcPos = () => {
      const r = card.getBoundingClientRect();
      let left = r.left;
      if (left + this.PANEL_W > window.innerWidth - 16) left = r.right - this.PANEL_W;
      if (left < 8) left = 8;
      let top = r.top + r.height / 2 - this.PANEL_H / 2;
      if (top < 88) top = 88;
      if (top + this.PANEL_H > window.innerHeight - 16) top = window.innerHeight - this.PANEL_H - 16;
      return { top, left };
    };

    if (this.isPanelVisible()) {
      // ── Already open: fast crossfade to new card ──────────────────────
      // 1. Activate fast-exit transition class
      this.isPanelSwitching.set(true);
      // 2. Trigger opacity out
      this.isPanelVisible.set(false);
      // 3. After 120ms (fast exit done), update content+pos and fade back in
      this.switchTimer = setTimeout(() => {
        this.panelMovie.set(this.enhanceSynopsis(movie));
        this.panelPos.set(calcPos());
        this.isPanelSwitching.set(false);   // restore spring transition
        // Extract real color from this poster
        this.extractDominantColor(movie.posterUrl).then(c => this.panelAccentColor.set(c));
        requestAnimationFrame(() => this.isPanelVisible.set(true));
      }, 120);
    } else {
      // ── Panel hidden: wait 250ms before showing ──
      this.showTimer = setTimeout(() => {
        this.panelMovie.set(this.enhanceSynopsis(movie));
        this.panelPos.set(calcPos());
        // Extract real color from this poster
        this.extractDominantColor(movie.posterUrl).then(c => this.panelAccentColor.set(c));
        requestAnimationFrame(() => this.isPanelVisible.set(true));
      }, 250);
    }
  }

  onPosterMouseLeave() {
    if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = null; }
    if (this.switchTimer) { clearTimeout(this.switchTimer); this.switchTimer = null; }
    // 400ms grace period: enough time to move from card into the details column
    this.hideTimer = setTimeout(() => {
      this.isPanelVisible.set(false);
      this.isPanelSwitching.set(false);
    }, 400);
  }

  enhanceSynopsis(movie: MovieItem): MovieItem {
    let extSyn = movie.synopsis;
    if (extSyn.length < 150) {
      extSyn += ' Questo capolavoro cinematografico ti trascinerà in un\'avventura senza precedenti, esplorando a fondo la psiche umana, i legami tra i personaggi e le conseguenze delle loro scelte. Un susseguirsi di colpi di scena continui e un finale indimenticabile che ti terrà incollato allo schermo dall\'inizio alla fine. Assolutamente da guardare in alta definizione.';
    }
    return { ...movie, synopsis: extSyn };
  }

  onPanelMouseEnter() {
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
  }

  onPanelMouseLeave() {
    this.hideTimer = setTimeout(() => {
      this.isPanelVisible.set(false);
    }, 120);
  }

  /** Immediately collapses the hover panel so a stale card panel
   *  never floats over the wrong film during scrolling. */
  private dismissHoverPanel() {
    if (this.isPanelVisible() || this.showTimer) {
      if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = null; }
      if (this.switchTimer) { clearTimeout(this.switchTimer); this.switchTimer = null; }
      if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
      this.isPanelVisible.set(false);
      this.isPanelSwitching.set(false);
    }
    if (this.episodeGlow().isHovered) {
      this.episodeGlow.update(glow => ({ ...glow, isHovered: false }));
    }
  }

  ngOnInit() {
    this.startHeroAutoplay();
  }

  ngAfterViewInit() {
    if (!this.isBrowser) return;
    setTimeout(() => {
      this.checkScrollState('continue-slider');
      this.checkScrollState('trending-slider');
      this.checkScrollState('episodes-slider');
      this.checkScrollState('new-releases-slider');
      this.checkScrollState('acclaimed-slider');
      this.checkScrollState('spotlight-slider');
      this.checkScrollState('coming-soon-slider');
      this.checkScrollState('hidden-gems-slider');
      this.checkScrollState('top-picks-slider');
      this.checkScrollState('action-movies-slider');

      // Extract real dominant colors from spotlight poster images
      this.spotlightMovies.forEach(movie => {
        this.extractDominantColor(movie.posterUrl).then(color => {
          movie.accentColor = color;
        });
      });

      // Extract hero button color for first slide
      this.extractDominantColor(this.heroMovies[0].backdropUrl).then(c => this.heroButtonColor.set(c));

      // Global capture-phase scroll listener:
      // This catches ANY scroll event on the page (horizontal or vertical,
      // on window, body, or any internal slider) and dismisses the panel.
      const handleGlobalScroll = (e: Event) => {
        const target = e.target as HTMLElement | Document;
        const isInsideSynopsis = target && 'closest' in target && !!(target as HTMLElement).closest('.ghp-synopsis');
        const isInsidePanel = target && 'closest' in target && !!(target as HTMLElement).closest('.global-hover-panel');

        let isHorizontalWheel = false;
        let deltaX = 0;

        if (e.type === 'wheel') {
          const wheelEvent = e as WheelEvent;
          if (Math.abs(wheelEvent.deltaX) > Math.abs(wheelEvent.deltaY)) {
            isHorizontalWheel = true;
            deltaX = wheelEvent.deltaX;
          }
        }

        if (isInsideSynopsis && !isHorizontalWheel) {
          // Allow vertical scroll inside synopsis to happen naturally
          return;
        }

        if (isHorizontalWheel && isInsidePanel && this.activeSliderId) {
          const slider = document.getElementById(this.activeSliderId);
          if (slider) slider.scrollBy({ left: deltaX, behavior: 'auto' });
        }

        this.dismissHoverPanel();
      };
      // Use capture: true so we intercept the scroll event before it bubbles
      // (actually, scroll events don't bubble, so capture is required to catch
      // them globally on the document).
      document.addEventListener('scroll', handleGlobalScroll, { capture: true, passive: true });
      document.addEventListener('wheel', handleGlobalScroll, { capture: true, passive: true });
      document.addEventListener('touchmove', handleGlobalScroll, { capture: true, passive: true });
      this.globalScrollCleanup = () => {
        document.removeEventListener('scroll', handleGlobalScroll, { capture: true });
        document.removeEventListener('wheel', handleGlobalScroll, { capture: true });
        document.removeEventListener('touchmove', handleGlobalScroll, { capture: true });
      };
      // Track mouse position so we can re-check glow after slider scrolls
      const trackMouse = (e: MouseEvent) => {
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      };
      document.addEventListener('mousemove', trackMouse, { passive: true });
      const prevCleanup = this.globalScrollCleanup;
      this.globalScrollCleanup = () => {
        if (prevCleanup) prevCleanup();
        document.removeEventListener('mousemove', trackMouse);
      };
    }, 200);
  }

  /**
   * Extracts the dominant vivid color from an image URL using Canvas API.
   * Falls back to a neutral accent if extraction fails.
   */
  extractDominantColor(imageUrl: string): Promise<string> {
    if (globalColorCache.has(imageUrl)) {
      return Promise.resolve(globalColorCache.get(imageUrl)!);
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 50;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, size, size);
          const data = ctx.getImageData(0, 0, size, size).data;

          let rSum = 0, gSum = 0, bSum = 0, count = 0;
          // Sample every 4th pixel, skip very dark/bright/desaturated ones
          for (let i = 0; i < data.length; i += 16) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;
            const brightness = max / 255;
            // Keep only vivid, mid-brightness pixels
            if (saturation > 0.25 && brightness > 0.2 && brightness < 0.95) {
              rSum += r; gSum += g; bSum += b; count++;
            }
          }

          if (count > 0) {
            const r = Math.round(rSum / count);
            const g = Math.round(gSum / count);
            const b = Math.round(bSum / count);
            const avg = (r + g + b) / 3;
            if (avg > 0) {
              const factor = Math.min(2.0, 150 / avg);
              const br = Math.min(255, Math.round(avg + (r - avg) * factor));
              const bg = Math.min(255, Math.round(avg + (g - avg) * factor));
              const bb = Math.min(255, Math.round(avg + (b - avg) * factor));
              const hslStr = `rgb(${br}, ${bg}, ${bb})`;
              globalColorCache.set(imageUrl, hslStr);
              resolve(hslStr);
            } else {
              resolve('#8a2be2'); // fallback
            }
          } else {
            resolve('#6366f1'); // fallback
          }
        } catch {
          resolve('#6366f1');
        }
      };
      img.onerror = () => resolve('#6366f1');
      img.src = imageUrl;
    });
  }

  /** Converts hex or rgb(...) color to rgba(..., alpha) for use in box-shadow */
  toRgba(color: string, alpha: number): string {
    if (!color) return `rgba(0,117,255,${alpha})`;
    // Already rgb(r,g,b)
    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    }
    // Hex #rrggbb
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  ngOnDestroy() {
    this.stopHeroAutoplay();
    if (this.hideTimer) clearTimeout(this.hideTimer);
    if (this.showTimer) clearTimeout(this.showTimer);
    if (this.switchTimer) clearTimeout(this.switchTimer);
    if (this.globalScrollCleanup) this.globalScrollCleanup();
  }

  onThemeChange(theme: 'dark' | 'light' | 'dynamic') {
    this.activeTheme.set(theme);
    if (theme === 'dynamic') {
      const currentMovie = this.heroMovies[this.currentHeroIndex()];
      this.dynamicBgColor.set(currentMovie.primaryColor);
    }
  }

  startHeroAutoplay() {
    this.stopHeroAutoplay();
    this.heroInterval = setInterval(() => {
      if (this.isHidden) return; // Pause timer when hidden
      this.nextHeroSlide();
    }, 6000);
  }

  stopHeroAutoplay() {
    if (this.heroInterval) {
      clearInterval(this.heroInterval);
      this.heroInterval = null;
    }
  }

  onHeroClick(event: MouseEvent, movie: any) {
    const target = event.target as HTMLElement;
    if (target.closest('button')) {
      return; // Ignore clicks on buttons (they handle their own actions)
    }

    const clickX = event.clientX;
    const screenWidth = window.innerWidth;
    const clickRatio = clickX / screenWidth;

    if (clickRatio < 0.25) {
      this.prevHeroSlide();
    } else if (clickRatio > 0.75) {
      this.nextHeroSlide();
    } else {
      this.goToMovie(movie);
    }
  }

  onTouchStart(event: TouchEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('button')) {
      this.touchStartX = 0;
      return;
    }
    this.touchStartX = event.changedTouches[0].screenX;
    this.touchEndX = event.changedTouches[0].screenX;
  }

  onTouchMove(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].screenX;
  }

  onTouchEnd(event: TouchEvent) {
    if (this.touchStartX === 0) return;
    const swipeThreshold = 80; // Increased threshold to avoid accidental scroll on taps
    const diff = this.touchStartX - this.touchEndX;
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        this.nextHeroSlide(); // Swiped left
      } else {
        this.prevHeroSlide(); // Swiped right
      }
      this.startHeroAutoplay(); // Reset autoplay timer
    }
  }

  nextHeroSlide() {
    const nextIdx = (this.currentHeroIndex() + 1) % this.heroMovies.length;
    this.setHeroSlide(nextIdx);
  }

  prevHeroSlide() {
    const prevIdx = (this.currentHeroIndex() - 1 + this.heroMovies.length) % this.heroMovies.length;
    this.setHeroSlide(prevIdx);
  }

  setHeroSlide(index: number) {
    this.currentHeroIndex.set(index);
    if (this.activeTheme() === 'dynamic') {
      this.dynamicBgColor.set(this.heroMovies[index].primaryColor);
    }
    // Extract real color from the new slide's backdrop
    this.extractDominantColor(this.heroMovies[index].backdropUrl).then(c => this.heroButtonColor.set(c));
    this.startHeroAutoplay(); // Reset timer to prevent quick jumps
  }

  onHeroScroll(event: Event) {
    const target = event.target as HTMLElement;
    const scrollLeft = target.scrollLeft;
    const width = target.clientWidth;
    const index = Math.round(scrollLeft / width);
    if (index !== this.currentHeroIndex() && index >= 0 && index < this.heroMovies.length) {
      this.currentHeroIndex.set(index);
      if (this.activeTheme() === 'dynamic') {
        this.dynamicBgColor.set(this.heroMovies[index].primaryColor);
      }
      this.extractDominantColor(this.heroMovies[index].backdropUrl).then(c => this.heroButtonColor.set(c));
      this.startHeroAutoplay(); // Reset timer
    }
  }

  togglePlayState(item: ContinueWatchingItem) {
    item.isPlaying = !item.isPlaying;
  }

  toggleBookmark(item: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if ('isBookmarked' in item) {
      item.isBookmarked = !item.isBookmarked;
    } else {
      item.isBookmarked = true;
    }
  }

  checkScrollState(containerId: string) {
    if (!this.isBrowser || typeof document === 'undefined') return;

    const el = document.getElementById(containerId);
    if (!el) return;

    const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 10;
    const canLeft = el.scrollLeft > 10;

    if (containerId === 'continue-slider') {
      this.canScrollRightContinue.set(canRight);
      this.canScrollLeftContinue.set(canLeft);
    } else if (containerId === 'trending-slider') {
      this.canScrollRightTrending.set(canRight);
      this.canScrollLeftTrending.set(canLeft);
    } else if (containerId === 'episodes-slider') {
      this.canScrollRightEpisodes.set(canRight);
      this.canScrollLeftEpisodes.set(canLeft);
    } else if (containerId === 'new-releases-slider') {
      this.canScrollRightNewReleases.set(canRight);
      this.canScrollLeftNewReleases.set(canLeft);
    } else if (containerId === 'acclaimed-slider') {
      this.canScrollRightAcclaimed.set(canRight);
      this.canScrollLeftAcclaimed.set(canLeft);
    } else if (containerId === 'spotlight-slider') {
      this.canScrollRightSpotlight.set(canRight);
      this.canScrollLeftSpotlight.set(canLeft);
    } else if (containerId === 'coming-soon-slider') {
      this.canScrollRightComingSoon.set(canRight);
      this.canScrollLeftComingSoon.set(canLeft);
    } else if (containerId === 'hidden-gems-slider') {
      this.canScrollRightHiddenGems.set(canRight);
      this.canScrollLeftHiddenGems.set(canLeft);
    } else if (containerId === 'top-picks-slider') {
      this.canScrollRightTopPicks.set(canRight);
      this.canScrollLeftTopPicks.set(canLeft);
    } else if (containerId === 'action-movies-slider') {
      this.canScrollRightActionMovies.set(canRight);
      this.canScrollLeftActionMovies.set(canLeft);
    }
  }

  scrollSlider(containerId: string, direction: 'left' | 'right') {
    if (!this.isBrowser || typeof document === 'undefined') return;

    const el = document.getElementById(containerId);
    if (el) {
      const scrollAmount = direction === 'left' ? -460 : 460;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });

      if (containerId === 'episodes-slider') {
        // Use scrollend (supported in Chrome 111+, FF 109+) with a 600ms fallback.
        // This guarantees recheckGlowUnderMouse runs AFTER the card has fully arrived.
        let settled = false;
        const onScrollEnd = () => {
          if (settled) return;
          settled = true;
          el.removeEventListener('scrollend', onScrollEnd);
          this.checkScrollState(containerId);
          this.recheckGlowUnderMouse();
        };
        el.addEventListener('scrollend', onScrollEnd, { once: true });
        // Fallback for browsers without scrollend support
        setTimeout(onScrollEnd, 600);
      } else {
        setTimeout(() => this.checkScrollState(containerId), 350);
      }
    }
  }

  /** After a scroll, find the episode card currently under the mouse.
   *  If it is now fully inside the visible (non-faded) zone, show the glow. */
  private recheckGlowUnderMouse() {
    if (!this.isBrowser) return;
    const el = document.elementFromPoint(this.lastMouseX, this.lastMouseY);
    if (!el) return;
    const card = el.closest('.episode-card') as HTMLElement | null;
    if (!card) return;

    const slider = card.closest('.episodes-slider') as HTMLElement | null;
    const rect = card.getBoundingClientRect();

    if (slider) {
      const sliderRect = slider.getBoundingClientRect();
      const scrollLeft = slider.scrollLeft;
      const maxScroll = slider.scrollWidth - slider.clientWidth;
      const leftThreshold = scrollLeft > 5 ? sliderRect.left + 160 : sliderRect.left - 1;
      const rightThreshold = scrollLeft < maxScroll - 5 ? sliderRect.right - 160 : sliderRect.right + 1;
      if (rect.left < leftThreshold || rect.right > rightThreshold) {
        return; // Still in the fade zone — don't show glow
      }
    }

    // Card is now fully visible — activate glow immediately
    if (this.episodeGlowHideTimer) {
      clearTimeout(this.episodeGlowHideTimer);
      this.episodeGlowHideTimer = null;
    }
    const color = card.style.getPropertyValue('--card-accent');
    this.episodeGlow.set({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      color: color,
      isHovered: true
    });
  }

  goToMovie(item: any) {
    const movieDetail = {
      id: item.id,
      title: item.title || item.showTitle || item.episodeTitle || 'Titolo Sconosciuto',
      year: item.year || 2024,
      duration: item.duration || item.totalTime || '2h 00m',
      matchScore: item.matchScore || '98% Match',
      genres: item.genres || ['Azione', 'Drammatico'],
      synopsis: item.synopsis || 'Nessuna sinossi disponibile.',
      backdropUrl: (item.backdropUrl || item.thumbnailUrl || item.posterUrl || '').replace(/w=\d+/, 'w=1600'),
      posterUrl: item.posterUrl || item.thumbnailUrl || item.backdropUrl || '',
      accentColor: item.accentColor || item.primaryColor || '#ff0000',
      director: item.director || 'Joseph Kosinski',
      producer: item.producer || 'Brad Pitt, Joseph Kosinski, Lewis Hamilton, Jerry Bruckheimer, Chad Oman, Dede Gardner, Jeremy Kleiner',
      releaseDate: item.releaseDate || 'June 26, 2025 (Germany)',
      music: item.music || 'Hans Zimmer',
      productionCompanies: item.productionCompanies || 'Dawn Apollo Films, Apple Original Films',
      distributedBy: item.distributedBy || 'Apple TV+, Warner Bros. Pictures',
      editedBy: item.editedBy || 'Stephen Mirrione',
      writers: item.writers || 'Ehren Kruger, Eric Warren Singer, Christopher McQuarrie',
      cinematography: item.cinematography || 'Claudio Miranda',
      budget: item.budget || '$130,000,000',
      boxOffice: item.boxOffice || '$1.496 Billion',
      languages: item.languages || 'English, Spanish',
      cast: item.cast || [
        { name: 'Brad Pitt', character: 'Sonny Hayes', imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
        { name: 'Damson Idris', character: 'Joshua Pearce', imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
        { name: 'Javier Bardem', character: 'Team Owner', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
        { name: 'Kerry Condon', character: 'Engineer', imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
        { name: 'Tobias Menzies', character: 'Rival Driver', imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
        { name: 'Sarah Niles', character: 'Team Boss', imageUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1bf98c?w=150&auto=format&fit=crop&q=80' },
        { name: 'Shea Whigham', character: 'Mechanic', imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
        { name: 'Joseph Kosinski', character: 'Director (Cameo)', imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
        { name: 'Lewis Hamilton', character: 'Himself', imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
        { name: 'Dede Gardner', character: 'Producer', imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' },
        { name: 'Tom Cruise', character: 'Guest Star', imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
        { name: 'Matt Damon', character: 'Rival Boss', imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
        { name: 'Emily Blunt', character: 'CEO', imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
        { name: 'John Krasinski', character: 'Analyst', imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
        { name: 'Zendaya', character: 'Reporter', imageUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1bf98c?w=150&auto=format&fit=crop&q=80' }
      ],
      screenshots: item.screenshots || [
        'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1585951237318-9ea5e175b891?w=400&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=800&auto=format&fit=crop&q=80'
      ],
      isBookmarked: item.isBookmarked || false
    };
    console.log('goToMovie clicked! Navigating with state:', movieDetail);
    const category = this.categoryService.activeCategory();
    const route = category === 'Serie TV' ? '/series' : '/movie';
    this.router.navigate([route, item.id], { state: { data: movieDetail } }).then(success => {
      console.log('Navigation success:', success);
    }).catch(err => {
      console.error('Navigation error:', err);
    });
  }
}
