import { Component, signal, OnDestroy, OnInit, AfterViewInit, inject, PLATFORM_ID, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { FooterComponent } from '../footer/footer';
import { ResponsiveService } from '../../services/responsive';
import { ThemeService } from '../../services/theme.service';
import { CategoryService } from '../../services/category.service';
import { HomeMobile } from './home-mobile/home-mobile';

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

  // Backup of original movies
  private originalHeroMovies: HeroMovie[] = [];
  private originalTrending: MovieItem[] = [];
  private originalTopWatched: TopWatchedItem[] = [];

  constructor() {
    effect(() => {
      const cat = this.categoryService.activeCategory();
      this.pageLoaded.set(false);
      setTimeout(() => {
        this.loadMockData(cat);
        if (this.isBrowser && this.heroMovies.length > 0) {
          this.extractDominantColor(this.heroMovies[0].backdropUrl).then(c => this.heroButtonColor.set(c));
          this.startHeroAutoplay();
        }
        // Piccolo ritardo per permettere il rendering prima del fade-in
        setTimeout(() => this.pageLoaded.set(true), 50);
      }, 300);
    });
  }

  loadMockData(category: string) {
    this.currentHeroIndex.set(0);
    if (this.originalHeroMovies.length === 0 && this.heroMovies && this.heroMovies.length > 0) {
      this.originalHeroMovies = [...this.heroMovies];
      this.originalTrending = [...this.trendingMovies];
      this.originalTopWatched = [...this.topWatchedMovies];
    }

    if (category === 'Animazione' || category === 'Anime') {
      this.heroMovies = [
        {
          id: 301,
          title: 'Spider-Man: Across the Spider-Verse',
          synopsis: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.',
          backdropUrl: 'https://images.unsplash.com/photo-1608889476518-738c9b1dcb40?w=1600&auto=format&fit=crop&q=80',
          primaryColor: '#ef4444'
        },
        {
          id: 302,
          title: 'Arcane',
          synopsis: 'Set in utopian Piltover and the oppressed underground of Zaun, the story follows the origins of two iconic League champions-and the power that will tear them apart.',
          backdropUrl: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=1600&auto=format&fit=crop&q=80',
          primaryColor: '#3b82f6'
        },
        {
          id: 303,
          title: 'Cyberpunk: Edgerunners',
          synopsis: 'A street kid trying to survive in a technology and body modification-obsessed city of the future. Having everything to lose, he chooses to stay alive by becoming an edgerunner.',
          backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=80',
          primaryColor: '#00f0ff'
        }
      ];
      this.trendingMovies = [
        { id: 401, title: 'Your Name', year: 2016, matchScore: '99% Match', genres: ['Anime', 'Romance'], synopsis: 'Two strangers find themselves linked in a bizarre way.', posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80', accentColor: '#3b82f6', duration: '1h 52m', isSeries: true },
        { id: 402, title: 'Spirited Away', year: 2001, matchScore: '98% Match', genres: ['Anime', 'Fantasy'], synopsis: 'During her family\'s move to the suburbs...', posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', accentColor: '#ef4444', duration: '2h 5m', isSeries: true },
        { id: 404, title: 'Akira', year: 1988, matchScore: '95% Match', genres: ['Anime', 'Sci-Fi'], synopsis: 'A secret military project endangers Neo-Tokyo.', posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', accentColor: '#ef4444', duration: '2h 4m', isSeries: true },
        { id: 405, title: 'Princess Mononoke', year: 1997, matchScore: '97% Match', genres: ['Anime', 'Adventure'], synopsis: 'On a journey to find the cure for a Tatarigami\'s curse...', posterUrl: 'https://images.unsplash.com/photo-1608889476518-738c9b1dcb40?w=500&auto=format&fit=crop&q=80', accentColor: '#10b981', duration: '2h 14m', isSeries: true },
        { id: 406, title: 'Ghost in the Shell', year: 1995, matchScore: '94% Match', genres: ['Anime', 'Cyberpunk'], synopsis: 'A cyborg policewoman and her partner hunt a mysterious and powerful hacker.', posterUrl: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=500&auto=format&fit=crop&q=80', accentColor: '#00f0ff', duration: '1h 23m', isSeries: true }
      ];
      this.topWatchedMovies = [
        { id: 403, title: 'Demon Slayer: Mugen Train', genres: ['Anime', 'Action'], year: 2020, watchPercent: 100, watchCount: '5M+', accentColor: '#ef4444', posterUrl: 'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=500&auto=format&fit=crop&q=80', isSeries: true },
        { id: 407, title: 'Jujutsu Kaisen 0', genres: ['Anime', 'Action'], year: 2021, watchPercent: 95, watchCount: '4M+', accentColor: '#3b82f6', posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80', isSeries: true },
        { id: 408, title: 'A Silent Voice', genres: ['Anime', 'Drama'], year: 2016, watchPercent: 90, watchCount: '3.5M+', accentColor: '#f43f5e', posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', isSeries: true },
        { id: 409, title: 'Howl\'s Moving Castle', genres: ['Anime', 'Fantasy'], year: 2004, watchPercent: 88, watchCount: '3M+', accentColor: '#10b981', posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', isSeries: true },
        { id: 410, title: 'Neon Genesis Evangelion', genres: ['Anime', 'Mecha'], year: 1995, watchPercent: 85, watchCount: '2.5M+', accentColor: '#8b5cf6', posterUrl: 'https://images.unsplash.com/photo-1608889476518-738c9b1dcb40?w=500&auto=format&fit=crop&q=80', isSeries: true }
      ];
    } else if (category === 'Serie TV') {
      this.heroMovies = [
        {
          id: 501,
          title: 'Stranger Things',
          synopsis: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
          backdropUrl: 'https://images.unsplash.com/photo-1614749219355-6b43d6c14175?w=1600&auto=format&fit=crop&q=80',
          primaryColor: '#ef4444',
          isSeries: true
        },
        {
          id: 502,
          title: 'The Crown',
          synopsis: 'Follows the political rivalries and romance of Queen Elizabeth II\'s reign and the events that shaped the second half of the twentieth century.',
          backdropUrl: 'https://images.unsplash.com/photo-1574676451642-171b3e8a4a58?w=1600&auto=format&fit=crop&q=80',
          primaryColor: '#d4af37',
          isSeries: true
        }
      ];
      this.trendingMovies = [
        { id: 601, title: 'Breaking Bad', year: 2008, matchScore: '99% Match', genres: ['Crime', 'Drama'], synopsis: 'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine.', posterUrl: 'https://images.unsplash.com/photo-1506744626753-1fa30fd20055?w=500&auto=format&fit=crop&q=80', accentColor: '#10b981', duration: '5 Seasons', isSeries: true },
        { id: 604, title: 'Game of Thrones', year: 2011, matchScore: '98% Match', genres: ['Fantasy', 'Drama'], synopsis: 'Nine noble families fight for control over the lands of Westeros...', posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80', accentColor: '#3b82f6', duration: '8 Seasons', isSeries: true },
        { id: 605, title: 'The Office', year: 2005, matchScore: '97% Match', genres: ['Comedy'], synopsis: 'A mockumentary on a group of typical office workers...', posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', accentColor: '#ef4444', duration: '9 Seasons', isSeries: true },
        { id: 606, title: 'Dark', year: 2017, matchScore: '96% Match', genres: ['Sci-Fi', 'Thriller'], synopsis: 'A family saga with a supernatural twist...', posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', accentColor: '#f59e0b', duration: '3 Seasons', isSeries: true },
        { id: 607, title: 'Peaky Blinders', year: 2013, matchScore: '95% Match', genres: ['Crime', 'History'], synopsis: 'A gangster family epic set in 1900s England...', posterUrl: 'https://images.unsplash.com/photo-1608889476518-738c9b1dcb40?w=500&auto=format&fit=crop&q=80', accentColor: '#6b7280', duration: '6 Seasons', isSeries: true },
        { id: 608, title: 'Succession', year: 2018, matchScore: '94% Match', genres: ['Drama'], synopsis: 'The Roy family is known for controlling the biggest media and entertainment company in the world...', posterUrl: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=500&auto=format&fit=crop&q=80', accentColor: '#d4af37', duration: '4 Seasons', isSeries: true }
      ];
      this.topWatchedMovies = [
        { id: 603, title: 'The Witcher', genres: ['Fantasy', 'Action'], year: 2019, watchPercent: 80, watchCount: '3M+', accentColor: '#3b82f6', posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80', isSeries: true },
        { id: 609, title: 'The Mandalorian', genres: ['Sci-Fi', 'Action'], year: 2019, watchPercent: 85, watchCount: '4M+', accentColor: '#10b981', posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', isSeries: true },
        { id: 610, title: 'Better Call Saul', genres: ['Crime', 'Drama'], year: 2015, watchPercent: 78, watchCount: '2.5M+', accentColor: '#ef4444', posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', isSeries: true },
        { id: 611, title: 'Fargo', genres: ['Crime', 'Thriller'], year: 2014, watchPercent: 75, watchCount: '2M+', accentColor: '#f97316', posterUrl: 'https://images.unsplash.com/photo-1608889476518-738c9b1dcb40?w=500&auto=format&fit=crop&q=80', isSeries: true },
        { id: 612, title: 'Severance', genres: ['Sci-Fi', 'Thriller'], year: 2022, watchPercent: 82, watchCount: '3.2M+', accentColor: '#3b82f6', posterUrl: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=500&auto=format&fit=crop&q=80', isSeries: true }
      ];
    } else {
      this.heroMovies = [...this.originalHeroMovies];
      this.trendingMovies = [...this.originalTrending];
      this.topWatchedMovies = [...this.originalTopWatched];
    }
  }

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

  onEpisodeEnter(event: MouseEvent, color: string) {}
  onEpisodeLeave() {}

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
  heroMovies: HeroMovie[] = [
    {
      id: 1,
      title: 'Ballerina',
      synopsis: 'An assassin trained in the traditions of the Ruska Roma organization sets out to seek revenge after her father\'s death. It is the fifth film in the John Wick franchise, serving as a spin-off set between the events of John Wick: Chapter 3 - Parabellum and John Wick: Chapter 4.',
      backdropUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&auto=format&fit=crop&q=80',
      primaryColor: '#8a2be2'
    },
    {
      id: 2,
      title: 'Dune: Part Two',
      synopsis: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he endeavors to prevent a terrible future.',
      backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
      primaryColor: '#ff9900'
    },
    {
      id: 3,
      title: 'Cyberpunk: Edgerunners',
      synopsis: 'A street kid trying to survive in a technology and body modification-obsessed city of the future. Having everything to lose, he chooses to stay alive by becoming an edgerunner—a mercenary outlaw.',
      backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=80',
      primaryColor: '#00f0ff'
    },
    {
      id: 4,
      title: 'Mickey 17',
      synopsis: 'Mickey 17, an expendable human clone, is sent on a high-risk expedition to colonize the ice planet Niflheim. Whenever he dies, a new body is regenerated with most of his memories intact.',
      backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80',
      primaryColor: '#00d2ff'
    },
    {
      id: 5,
      title: 'The Gorge',
      synopsis: 'Two highly trained elite snipers are assigned to guard opposite sides of a mysterious, lethal canyon, protecting the world from an unspeakable danger lurking within.',
      backdropUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=1600&auto=format&fit=crop&q=80',
      primaryColor: '#ff5e00'
    },
    {
      id: 6,
      title: 'Solo Leveling',
      synopsis: 'Sung Jinwoo, known as the weakest hunter of all mankind, gains access to a mysterious system allowing him to level up infinitely and transcend human limits.',
      backdropUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1600&auto=format&fit=crop&q=80',
      primaryColor: '#3a86ef'
    }
  ];

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
  trendingMovies: MovieItem[] = [
    {
      id: 201,
      title: 'MICKEY 17',
      year: 2026,
      matchScore: '98% Match',
      genres: ['Sci-Fi', 'Comedy'],
      synopsis: 'Mickey 17, an "expendable," is sent on a human expedition to colonize the ice world Niflheim.',
      posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
      accentColor: '#00d2ff',
      duration: '2h 17min'
    },
    {
      id: 202,
      title: 'THE GORGE',
      year: 2026,
      matchScore: '95% Match',
      genres: ['Action', 'Mystery'],
      synopsis: 'Two highly trained snipers are posted at guard posts on opposite sides of a lethal gorge.',
      posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
      accentColor: '#ff5e00',
      duration: '2h 1min'
    },
    {
      id: 203,
      title: 'SOLO LEVELING',
      year: 2026,
      matchScore: '99% Match',
      genres: ['Anime', 'Fantasy'],
      synopsis: 'Sung Jinwoo, the weakest hunter, gains a secret system allowing him to level up indefinitely.',
      posterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80',
      accentColor: '#3a86ef',
      duration: '24min / ep'
    },
    {
      id: 204,
      title: 'NOSFERATU',
      year: 2026,
      matchScore: '92% Match',
      genres: ['Horror', 'Drama'],
      synopsis: 'A gothic tale of obsession between a haunted young woman and a terrifying vampire.',
      posterUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500&auto=format&fit=crop&q=80',
      accentColor: '#a855f7',
      duration: '2h 12min'
    },
    {
      id: 205,
      title: 'NICKEL BOYS',
      year: 2026,
      matchScore: '94% Match',
      genres: ['Drama', 'History'],
      synopsis: 'Chronicles the powerful friendship of two young men at a 1960s reform school.',
      posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
      accentColor: '#eab308',
      duration: '2h 20min'
    },
    {
      id: 206,
      title: 'PLANKTON MOVIE',
      year: 2026,
      matchScore: '90% Match',
      genres: ['Animation', 'Comedy'],
      synopsis: 'Plankton\'s world is turned upside down when his plan for world domination takes a twist.',
      posterUrl: 'https://images.unsplash.com/photo-1569437061241-a848be43cc82?w=500&auto=format&fit=crop&q=80',
      accentColor: '#22c55e',
      duration: '1h 38min'
    },
    {
      id: 207,
      title: 'LIGHT BREAKS',
      year: 2026,
      matchScore: '96% Match',
      genres: ['Romance', 'Drama'],
      synopsis: 'From dusk to dawn, a young woman experiences a memorable day filled with emotion.',
      posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
      accentColor: '#f43f5e',
      duration: '1h 52min'
    },
    {
      id: 208,
      title: 'AVATAR 3',
      year: 2026,
      matchScore: '97% Match',
      genres: ['Sci-Fi', 'Adventure'],
      synopsis: 'Jake Sully and Neytiri encounter the Ash People, a fiery tribe of Na\'vi.',
      posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
      accentColor: '#0075ff',
      duration: '3h 5min'
    },
    {
      id: 209,
      title: 'BLADE RUNNER 2099',
      year: 2026,
      matchScore: '93% Match',
      genres: ['Sci-Fi', 'Thriller'],
      synopsis: 'Los Angeles fifty years after the events of 2049, uncovering new replicant secrets.',
      posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80',
      accentColor: '#ec4899',
      duration: '2h 35min'
    },
    {
      id: 210,
      title: 'THE BATMAN II',
      year: 2026,
      matchScore: '99% Match',
      genres: ['Action', 'Crime'],
      synopsis: 'Bruce Wayne delves deeper into Gotham\'s criminal underworld.',
      posterUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500&auto=format&fit=crop&q=80',
      accentColor: '#6366f1',
      duration: '2h 48min'
    }
  ];

  // Latest Episodes Available
  latestEpisodes: LatestEpisodeItem[] = [
    {
      id: 301,
      title: 'Daredevil: Born Again',
      seasonEpisode: 'Season1, Episode 2',
      bannerUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80',
      accentColor: '#ff3b30'
    },
    {
      id: 302,
      title: 'The Wheel of Time',
      seasonEpisode: 'Season3, Episode 6',
      bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      accentColor: '#ff9500'
    },
    {
      id: 303,
      title: 'Devil May Cry',
      seasonEpisode: 'Season1, Episode 8',
      bannerUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
      accentColor: '#a855f7'
    },
    {
      id: 304,
      title: 'Severance',
      seasonEpisode: 'Season2, Episode 10',
      bannerUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
      accentColor: '#00d2ff'
    },
    {
      id: 305,
      title: 'Arcane',
      seasonEpisode: 'Season2, Episode 9',
      bannerUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
      accentColor: '#ec4899'
    },
    {
      id: 306,
      title: 'House of the Dragon',
      seasonEpisode: 'Season3, Episode 1',
      bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      accentColor: '#ff5e00'
    }
  ];

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

  // Top 10 Most Watched List
  topWatchedMovies: TopWatchedItem[] = [
    { id: 401, title: 'Severance', genres: ['Thriller', 'Sci-Fi'], year: 2026, watchPercent: 100, watchCount: '3.2M', accentColor: '#ff5e00', posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80' },
    { id: 402, title: 'Arcane', genres: ['Animation', 'Action'], year: 2025, watchPercent: 85, watchCount: '2.8M', accentColor: '#f43f5e', posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80' },
    { id: 403, title: 'The Last of Us', genres: ['Drama', 'Action'], year: 2025, watchPercent: 72, watchCount: '2.1M', accentColor: '#eab308', posterUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500&auto=format&fit=crop&q=80' },
    { id: 404, title: 'Dune: Part Two', genres: ['Sci-Fi', 'Adventure'], year: 2024, watchPercent: 65, watchCount: '1.9M', accentColor: '#00d2ff', posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80' },
    { id: 405, title: 'Spider-Man: Beyond', genres: ['Animation', 'Action'], year: 2025, watchPercent: 58, watchCount: '1.5M', accentColor: '#ec4899', posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80' },
    { id: 406, title: 'Oppenheimer', genres: ['Drama', 'History'], year: 2023, watchPercent: 45, watchCount: '1.1M', accentColor: '#6366f1', posterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80' },
    { id: 407, title: 'Succession', genres: ['Drama', 'Comedy'], year: 2023, watchPercent: 38, watchCount: '900K', accentColor: '#a855f7', posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80' },
    { id: 408, title: 'The Bear', genres: ['Drama', 'Comedy'], year: 2024, watchPercent: 30, watchCount: '850K', accentColor: '#22c55e', posterUrl: 'https://images.unsplash.com/photo-1569437061241-a848be43cc82?w=500&auto=format&fit=crop&q=80' },
    { id: 409, title: 'House of the Dragon', genres: ['Drama', 'Fantasy'], year: 2024, watchPercent: 25, watchCount: '720K', accentColor: '#ff9500', posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80' },
    { id: 410, title: 'Shogun', genres: ['Drama', 'History'], year: 2024, watchPercent: 20, watchCount: '600K', accentColor: '#ff3b30', posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80' }
  ];

  comingSoonMovies: MovieItem[] = [
    { id: 801, title: 'Inception 2', genres: ['Sci-Fi', 'Action'], year: 2026, matchScore: '99% Match', synopsis: 'A new level of dreams is explored.', posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80', accentColor: '#3b82f6', duration: '2h 30min' },
    { id: 802, title: 'Dune: Part Three', genres: ['Sci-Fi', 'Adventure'], year: 2026, matchScore: '95% Match', synopsis: 'Paul Atreides continues his journey.', posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80', accentColor: '#f59e0b', duration: '2h 50min' },
    { id: 803, title: 'Avenger: Secret Wars', genres: ['Action', 'Superhero'], year: 2027, matchScore: '98% Match', synopsis: 'The final battle for the multiverse.', posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', accentColor: '#ef4444', duration: '3h 0min' },
    { id: 804, title: 'Interstellar 2', genres: ['Sci-Fi', 'Drama'], year: 2026, matchScore: '90% Match', synopsis: 'Beyond the wormhole.', posterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80', accentColor: '#8b5cf6', duration: '2h 49min' },
    { id: 805, title: 'Matrix 5', genres: ['Sci-Fi', 'Action'], year: 2027, matchScore: '85% Match', synopsis: 'The matrix reloads once more.', posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', accentColor: '#10b981', duration: '2h 16min' },
    { id: 806, title: 'Avatar 4', genres: ['Sci-Fi', 'Adventure'], year: 2028, matchScore: '92% Match', synopsis: 'The tulkun return.', posterUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500&auto=format&fit=crop&q=80', accentColor: '#3b82f6', duration: '3h 12min' },
    { id: 807, title: 'Blade', genres: ['Action', 'Horror'], year: 2025, matchScore: '88% Match', synopsis: 'The daywalker rises.', posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80', accentColor: '#ef4444', duration: '2h 5min' },
    { id: 808, title: 'Tron: Ares', genres: ['Sci-Fi', 'Action'], year: 2025, matchScore: '82% Match', synopsis: 'Return to the grid.', posterUrl: 'https://images.unsplash.com/photo-1569437061241-a848be43cc82?w=500&auto=format&fit=crop&q=80', accentColor: '#06b6d4', duration: '1h 58min' }
  ];

  hiddenGemsMovies: MovieItem[] = [
    { id: 901, title: 'The Fall', genres: ['Fantasy', 'Adventure'], year: 2006, matchScore: '85% Match', synopsis: 'A beautiful tale of imagination.', posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', accentColor: '#f59e0b', duration: '1h 57min' },
    { id: 902, title: 'Coherence', genres: ['Sci-Fi', 'Thriller'], year: 2013, matchScore: '92% Match', synopsis: 'A comet brings strange occurrences.', posterUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500&auto=format&fit=crop&q=80', accentColor: '#3b82f6', duration: '1h 29min' },
    { id: 903, title: 'Primer', genres: ['Sci-Fi', 'Drama'], year: 2004, matchScore: '78% Match', synopsis: 'Accidental time travel.', posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80', accentColor: '#10b981', duration: '1h 17min' },
    { id: 904, title: 'Moon', genres: ['Sci-Fi', 'Mystery'], year: 2009, matchScore: '90% Match', synopsis: 'Three years on the moon.', posterUrl: 'https://images.unsplash.com/photo-1569437061241-a848be43cc82?w=500&auto=format&fit=crop&q=80', accentColor: '#f97316', duration: '1h 37min' },
    { id: 905, title: 'Ex Machina', genres: ['Sci-Fi', 'Thriller'], year: 2014, matchScore: '95% Match', synopsis: 'Testing artificial intelligence.', posterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80', accentColor: '#ef4444', duration: '1h 48min' },
    { id: 906, title: 'The Man from Earth', genres: ['Drama', 'Sci-Fi'], year: 2007, matchScore: '88% Match', synopsis: 'A story of immortality.', posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80', accentColor: '#8b5cf6', duration: '1h 27min' },
    { id: 907, title: 'Gattaca', genres: ['Sci-Fi', 'Drama'], year: 1997, matchScore: '94% Match', synopsis: 'Defying genetic destiny.', posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80', accentColor: '#f43f5e', duration: '1h 52min' },
    { id: 908, title: 'Children of Men', genres: ['Sci-Fi', 'Thriller'], year: 2006, matchScore: '96% Match', synopsis: 'A world without children.', posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', accentColor: '#6366f1', duration: '1h 49min' }
  ];

  topPicksMovies: MovieItem[] = [
    { id: 1001, title: 'The Prestige', genres: ['Drama', 'Mystery'], year: 2006, matchScore: '98% Match', synopsis: 'Rival magicians engage in competitive one-upmanship.', posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80', accentColor: '#3b82f6', duration: '2h 10min' },
    { id: 1002, title: 'Arrival', genres: ['Sci-Fi', 'Drama'], year: 2016, matchScore: '95% Match', synopsis: 'A linguist works with the military to communicate with alien lifeforms.', posterUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500&auto=format&fit=crop&q=80', accentColor: '#f59e0b', duration: '1h 56min' },
    { id: 1003, title: 'Se7en', genres: ['Crime', 'Drama'], year: 1995, matchScore: '94% Match', synopsis: 'Two detectives hunt a serial killer.', posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80', accentColor: '#ef4444', duration: '2h 7min' },
    { id: 1004, title: 'Gladiator', genres: ['Action', 'Drama'], year: 2000, matchScore: '97% Match', synopsis: 'A former Roman General sets out to exact vengeance.', posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', accentColor: '#8b5cf6', duration: '2h 35min' },
    { id: 1005, title: 'The Departed', genres: ['Crime', 'Thriller'], year: 2006, matchScore: '92% Match', synopsis: 'An undercover cop and a mole in the police attempt to identify each other.', posterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80', accentColor: '#10b981', duration: '2h 31min' },
    { id: 1006, title: 'Whiplash', genres: ['Drama', 'Music'], year: 2014, matchScore: '96% Match', synopsis: 'A promising young drummer enrolls at a cut-throat music conservatory.', posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', accentColor: '#3b82f6', duration: '1h 47min' },
    { id: 1007, title: 'Parasite', genres: ['Comedy', 'Thriller'], year: 2019, matchScore: '99% Match', synopsis: 'Greed and class discrimination threaten the newly formed symbiotic relationship between two families.', posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80', accentColor: '#ef4444', duration: '2h 12min' },
    { id: 1008, title: 'Prisoners', genres: ['Crime', 'Drama'], year: 2013, matchScore: '91% Match', synopsis: 'When Keller Dover\'s daughter goes missing, he takes matters into his own hands.', posterUrl: 'https://images.unsplash.com/photo-1569437061241-a848be43cc82?w=500&auto=format&fit=crop&q=80', accentColor: '#06b6d4', duration: '2h 33min' }
  ];

  actionMovies: MovieItem[] = [
    { id: 1101, title: 'Mad Max: Fury Road', genres: ['Action', 'Sci-Fi'], year: 2015, matchScore: '99% Match', synopsis: 'In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland.', posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80', accentColor: '#f59e0b', duration: '2h 0min' },
    { id: 1102, title: 'John Wick: Chapter 4', genres: ['Action', 'Thriller'], year: 2023, matchScore: '97% Match', synopsis: 'John Wick uncovers a path to defeating The High Table.', posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', accentColor: '#3b82f6', duration: '2h 49min' },
    { id: 1103, title: 'Die Hard', genres: ['Action', 'Thriller'], year: 1988, matchScore: '94% Match', synopsis: 'An NYPD officer tries to save his wife and several others taken hostage by German terrorists.', posterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80', accentColor: '#10b981', duration: '2h 12min' },
    { id: 1104, title: 'The Dark Knight', genres: ['Action', 'Crime'], year: 2008, matchScore: '99% Match', synopsis: 'When the menace known as the Joker wreaks havoc on Gotham, Batman must accept one of the greatest psychological and physical tests of his ability.', posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80', accentColor: '#f97316', duration: '2h 32min' },
    { id: 1105, title: 'Mission: Impossible - Fallout', genres: ['Action', 'Adventure'], year: 2018, matchScore: '96% Match', synopsis: 'Ethan Hunt and his IMF team, along with some familiar allies, race against time after a mission goes wrong.', posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80', accentColor: '#ef4444', duration: '2h 27min' },
    { id: 1106, title: 'Terminator 2: Judgment Day', genres: ['Action', 'Sci-Fi'], year: 1991, matchScore: '95% Match', synopsis: 'A cyborg, identical to the one who failed to kill Sarah Connor, must now protect her ten year old son.', posterUrl: 'https://images.unsplash.com/photo-1569437061241-a848be43cc82?w=500&auto=format&fit=crop&q=80', accentColor: '#8b5cf6', duration: '2h 17min' },
    { id: 1107, title: 'The Matrix', genres: ['Action', 'Sci-Fi'], year: 1999, matchScore: '98% Match', synopsis: 'A computer hacker learns from mysterious rebels about the true nature of his reality.', posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80', accentColor: '#f43f5e', duration: '2h 16min' },
    { id: 1108, title: 'Kill Bill: Vol. 1', genres: ['Action', 'Crime'], year: 2003, matchScore: '93% Match', synopsis: 'After awakening from a four-year coma, a former assassin wreaks vengeance on the team of assassins who betrayed her.', posterUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=500&auto=format&fit=crop&q=80', accentColor: '#6366f1', duration: '1h 51min' }
  ];

  // Detailed Spotlight Movies
  spotlightMovies: DetailedMovieItem[] = [
    {
      id: 501, title: 'F1 2025', synopsis: 'In the 1990s, Sonny Hayes was Formula 1\'s most promising driver until an accident on the track nearly ended his career...',
      posterUrl: 'https://images.unsplash.com/photo-1541443131876-44b03de101c5?w=500&auto=format&fit=crop&q=80', accentColor: '#14b8a6',
      duration: '122 minute', genres: ['Drama', 'Motorsport', 'Action'], director: 'Joseph Kosinski', stars: ['Brad Pitt', 'Javier Bardem'], likes: '1.2k'
    },
    {
      id: 502, title: 'Cyber Drift', synopsis: 'A rogue hacker enters an underground neon-lit racing tournament to win back her stolen memories.',
      posterUrl: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=500&auto=format&fit=crop&q=80', accentColor: '#ec4899',
      duration: '110 minute', genres: ['Sci-Fi', 'Racing', 'Thriller'], director: 'Lana Wachowski', stars: ['Zendaya', 'Keanu Reeves'], likes: '3.4k'
    },
    {
      id: 503, title: 'The Last Ascent', synopsis: 'A group of expert mountaineers face the ultimate test of survival when a sudden blizzard traps them on K2.',
      posterUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&auto=format&fit=crop&q=80', accentColor: '#0ea5e9',
      duration: '135 minute', genres: ['Adventure', 'Drama'], director: 'Alfonso Cuarón', stars: ['Oscar Isaac', 'Florence Pugh'], likes: '800'
    },
    {
      id: 504, title: 'Neon Shadows', synopsis: 'In a dystopian future, a former detective is dragged back into the underworld to solve a series of mysterious disappearances.',
      posterUrl: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=500&auto=format&fit=crop&q=80', accentColor: '#f97316',
      duration: '142 minute', genres: ['Noir', 'Cyberpunk', 'Mystery'], director: 'Denis Villeneuve', stars: ['Ryan Gosling', 'Ana de Armas'], likes: '2.5k'
    }
  ];

  ngOnInit() {
    this.titleService.setTitle('DaisyMovie - Home');
    // Trigger entrance animations
    setTimeout(() => {
      this.pageLoaded.set(true);
    }, 100);

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
      this.checkScrollState('top-charts-slider');

      // Extract real dominant colors from spotlight poster images
      this.spotlightMovies.forEach(movie => {
        this.extractDominantColor(movie.posterUrl).then(color => {
          movie.accentColor = color;
        });
      });

      // Extract hero button color for first slide
      this.extractDominantColor(this.heroMovies[0].backdropUrl).then(c => {
        this.heroButtonColor.set(c);
      });

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

    // Check if it's a TV series or episode
    const route = (item.isSeries || item.seasonEpisode) ? '/series' : '/movie';

    this.router.navigate([route, item.id], { state: { data: movieDetail } }).then(success => {
      console.log('Navigation success:', success);
    }).catch(err => {
      console.error('Navigation error:', err);
    });
  }
}
