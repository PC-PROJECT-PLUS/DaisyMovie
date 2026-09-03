import { Component, signal, OnDestroy, OnInit, AfterViewInit, inject, PLATFORM_ID, effect, Injector, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { FooterComponent } from '../footer/footer';
import { ResponsiveService } from '../../services/responsive';
import { ThemeService } from '../../services/theme.service';
import { CategoryService } from '../../services/category.service';
import { HomeMobile } from './home-mobile/home-mobile';
import { TmdbService } from '../../services/tmdb.service';

export const globalColorCache = new Map<string, string>();

export interface HeroMovie {
  id: number;
  title: string;
  synopsis: string;
  backdropUrl: string;
  primaryColor: string;
  isBookmarked?: boolean;
  isSeries?: boolean;
}

export interface ContinueWatchingItem {
  id: number;
  showTitle: string;
  episodeTitle: string;
  currentTime: string;
  totalTime: string;
  progressPercent: number;
  thumbnailUrl: string;
  accentColor: string;
  airDate: string;
  isPlaying?: boolean;
}

export interface MovieItem {
  id: number;
  title: string;
  year: number;
  duration: string;
  matchScore: string;
  genres: string[];
  synopsis: string;
  posterUrl: string;
  accentColor: string;
  isBookmarked?: boolean;
  isSeries?: boolean;
}

export interface LatestEpisodeItem {
  id: number;
  title: string;
  seasonEpisode: string;
  bannerUrl: string;
  accentColor: string;
  isBookmarked?: boolean;
  isNotified?: boolean;
}

export interface TopWatchedItem {
  id: number;
  title: string;
  genres: string[];
  year: number;
  watchPercent: number;
  watchCount: string;
  accentColor: string;
  posterUrl: string;
  isBookmarked?: boolean;
  isSeries?: boolean;
}

export interface DetailedMovieItem {
  id: number;
  title: string;
  synopsis: string;
  posterUrl: string;
  accentColor: string;
  duration: string;
  genres: string[];
  director: string;
  stars: string[];
  likes: string;
  isBookmarked?: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FooterComponent, HomeMobile],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit, AfterViewInit, OnDestroy {
  public responsiveService = inject(ResponsiveService);
  public themeService = inject(ThemeService);
  public categoryService = inject(CategoryService);
  public tmdbService = inject(TmdbService);
  public ngZone = inject(NgZone);
  private injector = inject(Injector);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private titleService = inject(Title);
  private isBrowser = isPlatformBrowser(this.platformId);

  activeTheme = signal<'dark' | 'light' | 'dynamic'>('dark');
  dynamicBgColor = signal<string>('rgba(138, 43, 226, 0.35)');

  currentHeroIndex = signal<number>(0);
  heroButtonColor = signal<string>('#c026d3');
  pageLoaded = signal<boolean>(false);
  private heroInterval: any;

  pages: any = {
    trending: 1,
    newReleases: 1,
    spotlight: 1,
    classics: 1,
    hiddenGems: 1,
    topPicks: 1,
    action: 1
  };
  loadingPages: any = {};

  // Backup of original movies
  private originalHeroMovies: HeroMovie[] = [];
  private originalTrending: MovieItem[] = [];
  private originalTopWatched: TopWatchedItem[] = [];

  // Mock data removed

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

  canScrollRightClassics = signal<boolean>(true);
  canScrollLeftClassics = signal<boolean>(false);

  canScrollRightHiddenGems = signal<boolean>(true);
  canScrollLeftHiddenGems = signal<boolean>(false);

  canScrollRightTopPicks = signal<boolean>(true);
  canScrollLeftTopPicks = signal<boolean>(false);

  

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

  onEpisodeEnter(event: MouseEvent, color: string) { }
  onEpisodeLeave() { }

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
      if (left + this.PANEL_W > window.innerWidth - 16) left = window.innerWidth - this.PANEL_W - 16;
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

  // ─────────────────────────────────────────────────────────────────────────────

  // Hero Carousel (6 Movies)
  heroMovies: any[] = [];

  // Continue Watching List
  continueWatchingList: ContinueWatchingItem[] = [
    {
      id: 101,
      showTitle: 'Solo Leveling',
      episodeTitle: 'Season 2, Episode 11',
      airDate: 'August 14, 2026',
      currentTime: '03:23',
      totalTime: '00:26:05',
      progressPercent: 25,
      thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
      accentColor: '#3a86ef',
      isPlaying: false
    },
    {
      id: 102,
      showTitle: 'Ted Lasso',
      episodeTitle: 'Season 3, Episode 12',
      airDate: 'September 2, 2026',
      currentTime: '32:47',
      totalTime: '01:46:12',
      progressPercent: 60,
      thumbnailUrl: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&auto=format&fit=crop&q=80',
      accentColor: '#eab308',
      isPlaying: false
    },
    {
      id: 103,
      showTitle: 'The Last of Us',
      episodeTitle: 'Season 2, Episode 4',
      airDate: 'October 10, 2026',
      currentTime: '18:12',
      totalTime: '00:54:30',
      progressPercent: 33,
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
      accentColor: '#a855f7',
      isPlaying: false
    },
    {
      id: 104,
      showTitle: 'Stranger Things',
      episodeTitle: 'Season 5, Episode 1',
      airDate: 'November 1, 2026',
      currentTime: '45:00',
      totalTime: '01:10:00',
      progressPercent: 65,
      thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
      accentColor: '#ff4d4d',
      isPlaying: false
    }
  ];

  // Trending Movies Slider List
  trendingMovies: any[] = [];

  // Latest Episodes Available
  latestEpisodes: any[] = [];

  // New Releases List
  newReleasesMovies: MovieItem[] = [
    { id: 301, title: 'FURIOSA', year: 2026, matchScore: '95% Match', genres: ['Action', 'Adventure'], synopsis: 'The origin story of the warlord Furiosa before she meets Mad Max.', posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80', accentColor: '#ff5e00', duration: '2h 28min' },
    { id: 302, title: 'OPPENHEIMER 2', year: 2026, matchScore: '97% Match', genres: ['Drama', 'History'], synopsis: 'The aftermath of the Manhattan Project and its global consequences.', posterUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500&auto=format&fit=crop&q=80', accentColor: '#eab308', duration: '3h 10min' },
    { id: 303, title: 'INTERSTELLAR 2', year: 2026, matchScore: '99% Match', genres: ['Sci-Fi', 'Drama'], synopsis: 'A new crew ventures beyond known space following the events of the original journey.', posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80', accentColor: '#00d2ff', duration: '2h 55min' },
    { id: 304, title: 'ALIEN: ROMULUS 2', year: 2026, matchScore: '93% Match', genres: ['Horror', 'Sci-Fi'], synopsis: 'Young colonists on a space station encounter a terrifying new xenomorph strain.', posterUrl: 'https://images.unsplash.com/photo-1569437061241-a848be43cc82?w=500&auto=format&fit=crop&q=80', accentColor: '#22c55e', duration: '1h 59min' },
    { id: 305, title: 'WICKED: FOR GOOD', year: 2026, matchScore: '94% Match', genres: ['Musical', 'Drama'], synopsis: 'The spectacular conclusion to the beloved Wicked musical saga.', posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80', accentColor: '#a855f7', duration: '2h 40min' },
    { id: 306, title: 'MISSION: IMPOSSIBLE 8', year: 2026, matchScore: '96% Match', genres: ['Action', 'Thriller'], synopsis: 'Ethan Hunt faces his most impossible mission yet against a rogue AI.', posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', accentColor: '#f43f5e', duration: '2h 45min' },
    { id: 307, title: 'VENOM: LAST DANCE', year: 2026, matchScore: '91% Match', genres: ['Action', 'Sci-Fi'], synopsis: 'Eddie Brock and Venom face their greatest threat in a final showdown.', posterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80', accentColor: '#6366f1', duration: '1h 49min' },
    { id: 308, title: 'DEADPOOL & WOLVERINE 2', year: 2026, matchScore: '98% Match', genres: ['Action', 'Comedy'], synopsis: 'The Merc with a Mouth and Wolverine return for another chaotic adventure.', posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', accentColor: '#ec4899', duration: '2h 7min' }
  ];

  topWatchedMovies: any[] = [];

  trendingPeriod: string = 'week';
  isDropdownOpen: boolean = false;
  isLoadingTrending: boolean = false;
  trendingPeriodOptions = [
    { value: 'week', label: 'Questa settimana' },
    { value: 'month', label: 'Questo mese' },
    { value: 'year', label: 'Quest\'anno' }
  ];

  get currentTrendingLabel() {
    return this.trendingPeriodOptions.find(o => o.value === this.trendingPeriod)?.label || 'Questa settimana';
  }

  classicsMovies: any[] = [];

  hiddenGemsMovies: any[] = [];

  topPicksMovies: any[] = [];
  acclaimedMovies: any[] = [];

  dynamicSliders: { id: string, title: string, genreId: number, movies: any[], canScrollLeft: any, canScrollRight: any, page: number, isLoaded?: boolean, isLoading?: boolean }[] = [];

  // Detailed Spotlight Movies
  spotlightMovies: any[] = [];

  getUpcomingTitle(): string {
    const cat = this.categoryService.activeCategory();
    if (cat === 'Serie TV') return 'Serie tv che stanno per uscire';
    if (cat === 'Anime') return 'Anime e film che stanno per uscire';
    return 'Film che stanno per uscire';
  }

  ngOnInit() {
    this.titleService.setTitle('DaisyMovie - Home');

    effect(() => {
      const cat = this.categoryService.activeCategory();
      const fetchStartTime = Date.now();
      if (this.isBrowser) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
      this.pageLoaded.set(false);
      this.currentHeroIndex.set(0);
      Object.keys(this.pages).forEach((k) => (this.pages as any)[k] = 1);

      // We intentionally do not clear arrays here so the old content remains visible while fading out.
      

      this.tmdbService.getGenreList(cat).subscribe(genres => {
      this.dynamicSliders = genres
        .filter(g => g.id !== 28 && g.id !== 9648 && g.id !== 14)
        .sort(() => Math.random() - 0.5)
        .map(g => ({
          id: `genre-${g.id}`,
          title: g.name,
          genreId: g.id,
          movies: [],
          canScrollLeft: signal(false),
          canScrollRight: signal(true),
          page: 1,
          isLoaded: false,
          isLoading: false
        }));
      setTimeout(() => this.checkVerticalSliders(), 500);
    });

    this.tmdbService.getHomeData(cat, '1').subscribe(data1 => {
        const finishPhase1 = () => {
          if (data1.heroMovies) this.heroMovies = data1.heroMovies;
          if (data1.trendingMovies) this.trendingMovies = data1.trendingMovies;
          if (data1.latestEpisodes) {
            Promise.all(data1.latestEpisodes.map((ep: any) =>
              this.extractDominantColor(ep.bannerUrl).then(color => ({ ...ep, accentColor: color }))
            )).then(updatedEps => {
              this.latestEpisodes = updatedEps;
            });
          }

          if (this.isBrowser && this.heroMovies.length > 0) {
            this.heroMovies.forEach(movie => {
              this.extractDominantColor(movie.backdropUrl);
            });
            this.setHeroSlide(0);
            this.startHeroAutoplay();
          }

          setTimeout(() => {
            this.pageLoaded.set(true);
          }, 50);
        };

        const executePhase1 = () => {
          const elapsed = Date.now() - fetchStartTime;
          const remaining = Math.max(0, 400 - elapsed);
          setTimeout(finishPhase1, remaining);
        };

        if (this.isBrowser && data1.heroMovies && data1.heroMovies.length > 0) {
          const img = new Image();
          img.onload = executePhase1;
          img.onerror = executePhase1;
          img.src = data1.heroMovies[0].backdropUrl;
        } else {
          executePhase1();
        }
      });

      // Fase 2: il resto della pagina (avviato in parallelo alla Fase 1)
      this.tmdbService.getHomeData(cat, '2').subscribe(data2 => {
        if (data2.newReleasesMovies) this.newReleasesMovies = data2.newReleasesMovies;

        // Initial load for Top 10
        this.loadTrendingTop10(cat);

        if (data2.spotlightMovies) {
          Promise.all(data2.spotlightMovies.map((movie: any) =>
            this.extractDominantColor(movie.posterUrl).then(color => ({ ...movie, accentColor: color }))
          )).then(updatedMovies => {
            this.spotlightMovies = updatedMovies;
          });
        }

        if (data2.classicsMovies) this.classicsMovies = data2.classicsMovies;
        if (data2.hiddenGemsMovies) this.hiddenGemsMovies = data2.hiddenGemsMovies;
          if (data2.topPicksMovies) this.topPicksMovies = data2.topPicksMovies;
          if (data2.acclaimedMovies) this.acclaimedMovies = data2.acclaimedMovies;
      });
    }, { injector: this.injector });
  }

  checkVerticalSliders() {
    if (!this.isBrowser) return;
    const viewportBottom = window.innerHeight;
    for (const slider of this.dynamicSliders) {
      if (!slider.isLoaded && !slider.isLoading) {
        const el = document.getElementById(slider.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top < viewportBottom + 3000) {
            this.loadDynamicSlider(slider);
          }
        }
      }
    }
  }

  loadDynamicSlider(slider: any) {
    slider.isLoading = true;
    const cat = this.categoryService.activeCategory();
    this.tmdbService.getCategoryPage(slider.genreId.toString(), cat, 1).subscribe({
      next: (data) => {
        if (data) {
          slider.movies = data;
        }
        slider.isLoaded = true;
        slider.isLoading = false;
        setTimeout(() => this.checkScrollState(slider.id), 200);
      },
      error: () => {
        slider.isLoading = false;
      }
    });
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
      this.checkScrollState('classics-slider');
      this.checkScrollState('hidden-gems-slider');
      this.checkScrollState('top-picks-slider');
      this.checkScrollState('acclaimed-slider');
      this.checkScrollState('top-charts-slider');

      // Global capture-phase scroll listener:
      // This catches ANY scroll event on the page (horizontal or vertical,
      // on window, body, or any internal slider) and dismisses the panel.
      const handleGlobalScroll = (e: Event) => {
        this.ngZone.run(() => this.checkVerticalSliders());
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
      this.ngZone.runOutsideAngular(() => {
        document.addEventListener('scroll', handleGlobalScroll, { capture: true, passive: true });
        document.addEventListener('wheel', handleGlobalScroll, { capture: true, passive: true });
        document.addEventListener('touchmove', handleGlobalScroll, { capture: true, passive: true });

        // Delegated scroll listener for all sliders to replace the (scroll) template bindings
        const handleSliderScroll = (e: Event) => {
          const target = e.target as HTMLElement;
          if (target && target.classList) {
            if (target.classList.contains('trending-slider') ||
              target.classList.contains('episodes-slider') ||
              target.classList.contains('continue-watching-slider') ||
              target.classList.contains('spotlight-slider')) {
              if (target.id) this.checkScrollState(target.id);
            }
          }
        };
        document.addEventListener('scroll', handleSliderScroll, { capture: true, passive: true });

        const trackMouse = (e: MouseEvent) => {
          this.lastMouseX = e.clientX;
          this.lastMouseY = e.clientY;
        };
        document.addEventListener('mousemove', trackMouse, { passive: true });

        this.globalScrollCleanup = () => {
          document.removeEventListener('scroll', handleGlobalScroll, { capture: true });
          document.removeEventListener('wheel', handleGlobalScroll, { capture: true });
          document.removeEventListener('touchmove', handleGlobalScroll, { capture: true });
          document.removeEventListener('scroll', handleSliderScroll, { capture: true });
          document.removeEventListener('mousemove', trackMouse);
        };
      });
    }, 200);
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectTrendingPeriod(value: string) {
    if (this.trendingPeriod === value) {
      this.isDropdownOpen = false;
      return;
    }
    this.trendingPeriod = value;
    this.isDropdownOpen = false;
    this.isLoadingTrending = true;
    const cat = this.categoryService.activeCategory();
    this.loadTrendingTop10(cat);
  }

  changeTrendingPeriod(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.trendingPeriod = selectElement.value;
    const cat = this.categoryService.activeCategory();
    this.loadTrendingTop10(cat);
  }

  loadTrendingTop10(category: string) {
    this.tmdbService.getTrendingTop10(category, this.trendingPeriod).subscribe(movies => {
      if (movies) {
        const slicedMovies = movies.slice(0, 10);
        // Assegna immediatamente i film per non bloccare l'interfaccia (mostra il fallback scuro)
        this.topWatchedMovies = [...slicedMovies];
        this.isLoadingTrending = false;

        // Estrai i colori in background e aggiorna l'array
        Promise.all(slicedMovies.map((movie: any) =>
          this.extractDominantColor(movie.posterUrl).then(color => ({ ...movie, accentColor: color }))
        )).then(updatedMovies => {
          this.topWatchedMovies = updatedMovies;
        });
      }
    });
  }

  /**
   * Extracts the dominant vivid color from an image URL using Canvas API.
   * Falls back to a neutral accent if extraction fails.
   */
  extractDominantColor(imageUrl: string): Promise<string> {
    if (!this.isBrowser || typeof Image === 'undefined') {
      return Promise.resolve('#141414'); // Fallback sicuro per SSR
    }

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
          let rTotal = 0, gTotal = 0, bTotal = 0, totalCount = 0;

          // Sample every 4th pixel
          for (let i = 0; i < data.length; i += 16) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            rTotal += r; gTotal += g; bTotal += b; totalCount++;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;
            const brightness = max / 255;

            // Keep vivid, mid-brightness pixels
            if (saturation > 0.15 && brightness > 0.1 && brightness < 0.95) {
              rSum += r; gSum += g; bSum += b; count++;
            }
          }

          if (count === 0 && totalCount > 0) {
            // Fallback to overall average if no vivid pixels found
            rSum = rTotal; gSum = gTotal; bSum = bTotal; count = totalCount;
          }

          if (count > 0) {
            const r = Math.round(rSum / count);
            const g = Math.round(gSum / count);
            const b = Math.round(bSum / count);
            // Boost saturation: push colors away from grey
            const avg = (r + g + b) / 3;
            const factor = 1.5;
            const br = Math.min(255, Math.round(avg + (r - avg) * factor));
            const bg = Math.min(255, Math.round(avg + (g - avg) * factor));
            const bb = Math.min(255, Math.round(avg + (b - avg) * factor));
            const hslStr = `rgb(${br}, ${bg}, ${bb})`;
            globalColorCache.set(imageUrl, hslStr);
            resolve(hslStr);
          } else {
            resolve('#8a2be2'); // Fallback
          }
        } catch {
          resolve('#6366f1');
        }
      };
      img.onerror = () => resolve('#6366f1'); // Fallback

      // Ottimizzazione estrema: invece di scaricare l'immagine originale da 2MB
      // per estrarre il colore, usiamo una miniatura da pochi KB ('w300' invece di 'original').
      // Questo rende l'estrazione istantanea ed elimina l'effetto "switch di colore" ritardato.
      let smallImageUrl = imageUrl;
      if (smallImageUrl.includes('/original/')) {
        smallImageUrl = smallImageUrl.replace('/original/', '/w300/');
      }

      // Append a query param to bypass the browser's disk cache.
      img.src = smallImageUrl + (smallImageUrl.includes('?') ? '&' : '?') + 'corsbuster=1';
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
      if (this.responsiveService.isMobile()) return; // Pause timer when hidden
      this.nextHeroSlide();
    }, 7000);
  }

  stopHeroAutoplay() {
    if (this.heroInterval) {
      clearInterval(this.heroInterval);
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

    // Reset timer when a slide is changed (manually or automatically)
    this.startHeroAutoplay();
  }

  togglePlayState(item: ContinueWatchingItem) {
    item.isPlaying = !item.isPlaying;
  }

  toggleBookmark(item: any, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    item.isBookmarked = !item.isBookmarked;
  }

  toggleNotification(item: LatestEpisodeItem, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    item.isNotified = !item.isNotified;
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
    } else if (containerId === 'classics-slider') {
      this.canScrollRightClassics.set(canRight);
      this.canScrollLeftClassics.set(canLeft);
    } else if (containerId === 'hidden-gems-slider') {
      this.canScrollRightHiddenGems.set(canRight);
      this.canScrollLeftHiddenGems.set(canLeft);
    } else if (containerId === 'top-picks-slider') {
      this.canScrollRightTopPicks.set(canRight);
      this.canScrollLeftTopPicks.set(canLeft);
    } else if (containerId === 'acclaimed-slider') {
      this.canScrollRightAcclaimed.set(canRight);
      this.canScrollLeftAcclaimed.set(canLeft);
    } else if (containerId.startsWith('genre-')) {
      const sliderObj = this.dynamicSliders.find(s => s.id === containerId);
      if (sliderObj) {
        sliderObj.canScrollRight.set(canRight);
        sliderObj.canScrollLeft.set(canLeft);
      }
    }

    // Trigger infinite loading early (when within 3500px of the end) to make it smooth
    // This aggressive buffer ensures the slider never blocks waiting for the network
    const shouldLoadMore = el.scrollLeft + el.clientWidth > el.scrollWidth - 3500;

    if (shouldLoadMore) {
      let listMap: any = {
        'trending-slider': 'trending',
        'new-releases-slider': 'newReleases',
        'spotlight-slider': 'spotlight',
        'classics-slider': 'classics',
        'hidden-gems-slider': 'hiddenGems',
        'top-picks-slider': 'topPicks',
        'acclaimed-slider': 'acclaimed'
      };
      if (listMap[containerId]) {
        this.loadMore(listMap[containerId]);
      } else if (containerId.startsWith('genre-')) {
        const sliderObj = this.dynamicSliders.find(s => s.id === containerId);
        if (sliderObj && !this.loadingPages[sliderObj.genreId]) {
          this.loadingPages[sliderObj.genreId] = true;
          sliderObj.page = (sliderObj.page || 1) + 1;
          this.tmdbService.getCategoryPage(sliderObj.genreId.toString(), this.categoryService.activeCategory(), sliderObj.page).subscribe(data => {
            if (data && data.length > 0) {
              const filterNew = (existing: any[], incoming: any[]) => {
                const existingIds = new Set(existing.map(i => i.id));
                return [...existing, ...incoming.filter(i => !existingIds.has(i.id))];
              };
              sliderObj.movies = filterNew(sliderObj.movies, data);
            }
            this.loadingPages[sliderObj.genreId] = false;
          });
        }
      }
    }
  }

  loadMore(listName: string) {
    if (this.loadingPages[listName]) return;
    this.loadingPages[listName] = true;
    this.pages[listName] = (this.pages[listName] || 1) + 1;

    const cat = this.categoryService.activeCategory();
    this.tmdbService.getCategoryPage(listName, cat, this.pages[listName]).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          const filterNew = (existing: any[], incoming: any[]) => {
            const existingIds = new Set(existing.map(i => i.id));
            return [...existing, ...incoming.filter(i => !existingIds.has(i.id))];
          };

          if (listName === 'trending') this.trendingMovies = filterNew(this.trendingMovies, data);
          if (listName === 'newReleases') this.newReleasesMovies = filterNew(this.newReleasesMovies, data);
          if (listName === 'spotlight') {
            this.spotlightMovies = filterNew(this.spotlightMovies, data);
            data.forEach((movie: any) => this.extractDominantColor(movie.posterUrl).then(c => movie.accentColor = c));
          }
          if (listName === 'classics') this.classicsMovies = filterNew(this.classicsMovies, data);
          if (listName === 'hiddenGems') this.hiddenGemsMovies = filterNew(this.hiddenGemsMovies, data);
          if (listName === 'topPicks') this.topPicksMovies = filterNew(this.topPicksMovies, data);
          if (listName === 'acclaimed') this.acclaimedMovies = filterNew(this.acclaimedMovies, data);
        }
        this.loadingPages[listName] = false;
      },
      error: () => {
        this.loadingPages[listName] = false;
      }
    });
  }

  scrollSlider(containerId: string, direction: 'left' | 'right') {
    if (!this.isBrowser || typeof document === 'undefined') return;

    const el = document.getElementById(containerId);
    if (el) {
      let scrollAmount = direction === 'left' ? -460 : 460;
      
      // Calculate exact stride based on the first card to align perfectly with scroll-snap
      const card = el.firstElementChild as HTMLElement;
      if (card) {
        const cardWidth = card.getBoundingClientRect().width;
        const elStyle = window.getComputedStyle(el);
        const gap = parseInt(elStyle.gap) || 0;
        const stride = cardWidth + gap;
        const visibleCards = Math.max(1, Math.floor(el.clientWidth / stride));
        scrollAmount = direction === 'left' ? -(stride * visibleCards) : (stride * visibleCards);
      }
      
      // Disabilita temporaneamente lo snap per evitare conflitti e "scatti" visivi
      el.style.scrollSnapType = 'none';
      
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      
      // Riabilita lo snap dopo che l'animazione è finita
      setTimeout(() => {
        el.style.scrollSnapType = '';
      }, 600);

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

    // Check if it's a TV series or episode
    const route = (item.isSeries || item.seasonEpisode) ? '/series' : '/movie';

    this.router.navigate([route, item.id], { state: { data: movieDetail } }).then(success => {
      console.log('Navigation success:', success);
    }).catch(err => {
      console.error('Navigation error:', err);
    });
  }
}



