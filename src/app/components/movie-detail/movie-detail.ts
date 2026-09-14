import { Component, OnInit, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { FooterComponent } from '../footer/footer';
import { ResponsiveService } from '../../services/responsive';
import { MovieDetailMobile } from './movie-detail-mobile/movie-detail-mobile';
import { LoaderService } from '../../services/loader.service';
import { TmdbService } from '../../services/tmdb.service';
import { FavoritesService } from '../../services/favorites.service';
import { HistoryService } from '../../services/history.service';
import { VideoPlayerComponent, PlayerConfig } from '../video-player/video-player';

export interface CastMember {
  name: string;
  character: string;
  imageUrl: string;
}

export interface Review {
  id: string;
  author: string;
  title: string;
  content: string;
  likes: number;
  dislikes: number;
  date: string;
}

export interface MovieDetail {
  id: number;
  title: string;
  year: number;
  duration: string;
  matchScore: string;
  genres: string[];
  synopsis: string;
  backdropUrl: string;
  posterUrl: string;
  accentColor: string;
  director: string;
  producer: string;
  music?: string;
  productionCompanies?: string;
  distributedBy?: string;
  editedBy?: string;
  writers?: string;
  cinematography?: string;
  budget?: string;
  boxOffice?: string;
  languages?: string;
  original_language?: string;
  originalLanguage?: string;
  origin_country?: string[];
  originCountry?: string[];
  releaseDate: string;
  cast: CastMember[];
  screenshots: string[];
  reviews: Review[];
  suggested?: any[];
  isBookmarked: boolean;
  secondaryColor?: string;
  omdbRatings?: {
    imdb?: string;
    rottenTomatoes?: string;
    metacritic?: string;
    tmdb?: string;
  } | null;
}

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, FooterComponent, MovieDetailMobile, VideoPlayerComponent],
  templateUrl: './movie-detail.html',
  styleUrl: './movie-detail.scss'
})
export class MovieDetailComponent implements OnInit {
  public responsiveService = inject(ResponsiveService);
  private historyService = inject(HistoryService);
  private loaderService = inject(LoaderService);
  private tmdbService = inject(TmdbService);
  favoritesService = inject(FavoritesService);
  movieId = signal<number | null>(null);
  movie = signal<MovieDetail | null>(null);
  activeTheme = signal<'dark' | 'light' | 'dynamic'>('dark');
  pageLoaded = signal<boolean>(false);

  // Slider edge fade signals
  canScrollRightCast = signal<boolean>(true);
  canScrollLeftCast = signal<boolean>(false);

  canScrollRightSuggested = signal<boolean>(true);
  canScrollLeftSuggested = signal<boolean>(false);

  newReviewText = signal<string>('');
  suggestedMovies = signal<any[]>([]);
  showAllReviews = signal<boolean>(false);

  // Suggested pagination
  suggestedPage = 1;
  isLoadingSuggested = false;
  
  resumeProgress = signal<number>(0);
  resumeText = signal<string>('');

  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  // VIDEO PLAYER STATE
  playerVisible = signal(false);
  playerConfig = signal<PlayerConfig | null>(null);

  async openPlayer() {
    const m = this.movie();
    if (!m) return;

    // Estraiamo sempre il colore fresco al momento del click,
    // così è garantito identico al colore del pulsante "Guarda ora"
    let accentColor = '#E50914';
    try {
      const imageUrl = m.backdropUrl || m.posterUrl;
      if (imageUrl && isPlatformBrowser(this.platformId)) {
        const colors = await this.extractDominantColors(imageUrl);
        // Usiamo il colore estratto solo se è HSL (significa che l'estrazione è riuscita)
        // altrimenti il fallback è già impostato a E50914 sopra
        if (colors.primary.startsWith('hsl')) {
          accentColor = colors.primary;
        }
      }
    } catch (e) { /* usa il fallback */ }

    let startAt = 0;
    if (isPlatformBrowser(this.platformId)) {
      const historyItem = this.historyService.getResumeProgress(m.id, false);
      if (historyItem && historyItem.progress_seconds && historyItem.progress_seconds > 0) {
        startAt = historyItem.progress_seconds;
      }
    }

    const genresStr = JSON.stringify(m.genres || []).toLowerCase();
    const isAnimation = genresStr.includes('anim');

    // Controllo sicuro che restringe la ricerca solo ai campi rilevanti per evitare falsi positivi (es. "Giappone" nella sinossi o "ja" nell'ID)
    const prodStr = JSON.stringify(m.productionCompanies || '').toLowerCase();
    const countryStr = JSON.stringify(m.origin_country || m.originCountry || '').toLowerCase();
    const origLangStr = JSON.stringify(m.original_language || m.originalLanguage || '').toLowerCase();

    // Check strict anime identifiers. Exclude spoken languages as western movies are dubbed in Japanese.
    const isJapanese = 
      origLangStr.includes('"ja"') || 
      origLangStr === '"ja"' ||
      countryStr.includes('"jp"') || 
      prodStr.includes('toei') ||
      prodStr.includes('mappa') ||
      prodStr.includes('ufotable') ||
      prodStr.includes('ghibli') ||
      prodStr.includes('kyoto animation') ||
      prodStr.includes('madhouse') ||
      prodStr.includes('bones') ||
      prodStr.includes('wit studio') ||
      prodStr.includes('cloverworks');

    const isAnime = isAnimation && isJapanese;

    this.playerConfig.set({
      id: m.id,
      type: 'movie',
      accentColor,
      startAt: startAt > 0 ? startAt : undefined,
      isAnime,
      title: m.title,
      posterUrl: m.posterUrl,
      backdropUrl: m.backdropUrl
    });
    this.playerVisible.set(true);
  }

  onPlayerClosed() {
    this.playerVisible.set(false);
    
    // Progress is now saved by VideoPlayerComponent internally via HistoryService
  }

  // HOVER PANEL STATE
  panelMovie = signal<any | null>(null);
  panelAccentColor = signal<string>('#0075ff');
  isPanelVisible = signal<boolean>(false);
  isPanelSwitching = signal<boolean>(false);
  panelPos = signal<{ top: number, left: number }>({ top: 0, left: 0 });

  private showTimer: any = null;
  private switchTimer: any = null;
  private hideTimer: any = null;
  private globalScrollCleanup: (() => void) | null = null;
  private panelWheelCleanup: (() => void) | null = null;
  private activeSliderId: string | null = null;
  private dataTimeout: any = null;
  private readonly PANEL_W = 500;
  private readonly PANEL_H = 350;

  private platformId = inject(PLATFORM_ID);

  // To avoid calling document when SSR
  get isBrowser() {
    return isPlatformBrowser(this.platformId);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {
    effect(() => {
      if (!this.loaderService.isPageLoading()) {
        setTimeout(() => this.pageLoaded.set(true), 50);
      } else {
        this.pageLoaded.set(false);
      }
    });
    
    effect(() => {
      const m = this.movie();
      if (!m || !isPlatformBrowser(this.platformId)) return;
      
      const historyItem = this.historyService.getResumeProgress(m.id, false);
      if (historyItem && historyItem.progress_seconds && historyItem.progress_seconds > 0) {
        this.resumeProgress.set(historyItem.progress_seconds);
        this.resumeText.set(`Riprendi da ${this.formatTime(historyItem.progress_seconds)}`);
      } else {
        this.resumeProgress.set(0);
        this.resumeText.set('');
      }
    }, { allowSignalWrites: true });

    // Scroll to top on load for that fresh page feel
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      if (isPlatformBrowser(this.platformId)) {
        setTimeout(() => window.scrollTo(0, 0), 10);
      }
      const id = params.get('id');
      if (id) {
        this.movieId.set(Number(id));
        if (isPlatformBrowser(this.platformId)) {
          const stateData = window.history.state?.data;
          if (stateData && stateData.id === Number(id)) {
            if (!stateData.reviews) {
              stateData.reviews = this.getMockReviews();
            }
            stateData.accentColor = stateData.accentColor || '#141414';
            this.movie.set(stateData);
            this.updateMovieAccentColor(stateData.backdropUrl || stateData.posterUrl);
          }
        }
        // Always fetch the full details to populate the 'Più informazioni' section
        this.loadMovieDetails(Number(id));
      }
    });

    // Initialize cast scroll state after rendering
    if (this.isBrowser) {
      setTimeout(() => {
        this.checkScrollState();

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
            return;
          }

          if (isHorizontalWheel && isInsidePanel && this.activeSliderId) {
            const slider = document.getElementById(this.activeSliderId);
            if (slider) slider.scrollBy({ left: deltaX, behavior: 'auto' });
          }

          this.dismissHoverPanel();
        };
        document.addEventListener('scroll', handleGlobalScroll, { capture: true, passive: true });
        document.addEventListener('wheel', handleGlobalScroll, { capture: true, passive: true });
        document.addEventListener('touchmove', handleGlobalScroll, { capture: true, passive: true });
        this.globalScrollCleanup = () => {
          document.removeEventListener('scroll', handleGlobalScroll, { capture: true });
          document.removeEventListener('wheel', handleGlobalScroll, { capture: true });
          document.removeEventListener('touchmove', handleGlobalScroll, { capture: true });
        };
      }, 300);
    }
  }

  ngOnDestroy() {
    if (this.dataTimeout) clearTimeout(this.dataTimeout);
    if (this.hideTimer) clearTimeout(this.hideTimer);
    if (this.showTimer) clearTimeout(this.showTimer);
    if (this.switchTimer) clearTimeout(this.switchTimer);
    if (this.globalScrollCleanup) this.globalScrollCleanup();
    if (this.panelWheelCleanup) this.panelWheelCleanup();
  }

  checkScrollState() {
    if (!this.isBrowser || typeof document === 'undefined') return;

    // Check Cast slider
    const elCast = document.getElementById('cast-slider');
    if (elCast) {
      const canRight = elCast.scrollLeft + elCast.clientWidth < elCast.scrollWidth - 10;
      const canLeft = elCast.scrollLeft > 10;
      this.canScrollRightCast.set(canRight);
      this.canScrollLeftCast.set(canLeft);
    }

    // Update suggested scroll arrows & infinite scroll
    const suggestedSlider = document.getElementById('suggested-slider');
    if (suggestedSlider) {
      this.canScrollLeftSuggested.set(suggestedSlider.scrollLeft > 0);
      this.canScrollRightSuggested.set(
        suggestedSlider.scrollLeft + suggestedSlider.clientWidth < suggestedSlider.scrollWidth - 10
      );

      const shouldLoadMore = suggestedSlider.scrollLeft + suggestedSlider.clientWidth > suggestedSlider.scrollWidth - 1000;
      if (shouldLoadMore && !this.isLoadingSuggested) {
        this.isLoadingSuggested = true;
        this.suggestedPage++;
        const id = this.movieId();
        if (id) {
          this.tmdbService.getRecommendations('movie', id, this.suggestedPage).subscribe({
            next: (data: any[]) => {
              if (data && data.length > 0) {
                this.movie.update(m => {
                  if (!m) return m;
                  const existingIds = new Set(m.suggested?.map((i: any) => i.id) || []);
                  const newItems = data.filter((i: any) => !existingIds.has(i.id));
                  return { ...m, suggested: [...(m.suggested || []), ...newItems] };
                });
              }
              this.isLoadingSuggested = false;
            },
            error: () => {
              this.isLoadingSuggested = false;
            }
          });
        }
      }
    }
  }

  scrollCast(direction: 'left' | 'right') {
    if (!this.isBrowser || typeof document === 'undefined') return;
    const el = document.getElementById('cast-slider');
    if (el) {
      const scrollAmount = direction === 'left' ? -460 : 460;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      // Update state after smooth scroll ends
      setTimeout(() => this.checkScrollState(), 400);
    }
  }

  scrollSuggested(direction: 'left' | 'right') {
    if (!this.isBrowser || typeof document === 'undefined') return;
    const el = document.getElementById('suggested-slider');
    if (el) {
      const scrollAmount = direction === 'left' ? -600 : 600;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(() => this.checkScrollState(), 400);
    }
  }

  // HOVER PANEL LOGIC
  onPosterMouseEnter(movie: any, event: MouseEvent) {
    if (!this.isBrowser) return;

    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
    if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = null; }
    if (this.switchTimer) { clearTimeout(this.switchTimer); this.switchTimer = null; }

    const card = event.currentTarget as HTMLElement;
    const sliderParent = card.closest('[id$="-slider"]');
    this.activeSliderId = sliderParent ? sliderParent.id : null;

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
      this.isPanelSwitching.set(true);
      this.isPanelVisible.set(false);
      this.switchTimer = setTimeout(() => {
        this.panelMovie.set(movie);
        this.panelPos.set(calcPos());
        this.isPanelSwitching.set(false);
        this.extractDominantColors(movie.posterUrl).then(c => this.panelAccentColor.set(c.primary));
        requestAnimationFrame(() => this.isPanelVisible.set(true));
      }, 120);
    } else {
      this.showTimer = setTimeout(() => {
        this.panelMovie.set(movie);
        this.panelPos.set(calcPos());
        this.extractDominantColors(movie.posterUrl).then(c => this.panelAccentColor.set(c.primary));
        requestAnimationFrame(() => this.isPanelVisible.set(true));
      }, 250);
    }
  }

  onPosterMouseLeave() {
    if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = null; }
    if (this.switchTimer) { clearTimeout(this.switchTimer); this.switchTimer = null; }
    this.hideTimer = setTimeout(() => {
      this.isPanelVisible.set(false);
      this.isPanelSwitching.set(false);
    }, 400);
  }

  onPanelMouseEnter() {
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
  }

  onPanelMouseLeave() {
    this.hideTimer = setTimeout(() => {
      this.isPanelVisible.set(false);
      this.isPanelSwitching.set(false);
    }, 300);
  }

  private dismissHoverPanel() {
    if (this.isPanelVisible() || this.showTimer) {
      if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = null; }
      if (this.switchTimer) { clearTimeout(this.switchTimer); this.switchTimer = null; }
      if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
      this.isPanelVisible.set(false);
      this.isPanelSwitching.set(false);
    }
  }

  private updateMovieAccentColor(imageUrl: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    this.extractDominantColors(imageUrl).then(colors => {
      this.movie.update(m => {
        if (m) return { ...m, accentColor: colors.primary, secondaryColor: colors.secondary };
        return m;
      });
    });
  }

  extractDominantColors(imageUrl: string): Promise<{ primary: string, secondary: string }> {
    return new Promise((resolve) => {
      const defaultColors = { primary: '#0075ff', secondary: '#ff5e00' };
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
          const validPixels = [];
          for (let i = 0; i < data.length; i += 16) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;

            if (max > 20 && max < 250 && saturation > 0.1) {
              validPixels.push({ r, g, b });
              rSum += r; gSum += g; bSum += b; count++;
            }
          }

          if (count > 0) {
            const pR = Math.round(rSum / count);
            const pG = Math.round(gSum / count);
            const pB = Math.round(bSum / count);

            let rSum2 = 0, gSum2 = 0, bSum2 = 0, count2 = 0;
            for (const p of validPixels) {
              const dist = Math.abs(p.r - pR) + Math.abs(p.g - pG) + Math.abs(p.b - pB);
              if (dist > 60) {
                rSum2 += p.r; gSum2 += p.g; bSum2 += p.b; count2++;
              }
            }

            const hsl1 = this.rgbToHsl(pR, pG, pB);
            hsl1.s = Math.min(100, hsl1.s * 1.5);
            hsl1.l = Math.max(40, Math.min(60, hsl1.l * 1.1));
            const primary = `hsl(${hsl1.h}, ${hsl1.s}%, ${hsl1.l}%)`;

            let secondary = primary;
            if (count2 > count * 0.05) {
              const sR = Math.round(rSum2 / count2);
              const sG = Math.round(gSum2 / count2);
              const sB = Math.round(bSum2 / count2);
              const hsl2 = this.rgbToHsl(sR, sG, sB);

              // Shift slightly for an analogous color rather than full complementary
              let hDiff = Math.abs(hsl1.h - hsl2.h);
              if (hDiff < 30 || hDiff > 330) {
                hsl2.h = (hsl1.h + 40) % 360;
              }

              hsl2.s = Math.min(100, hsl2.s * 1.5);
              hsl2.l = Math.max(40, Math.min(60, hsl2.l * 1.1));
              secondary = `hsl(${hsl2.h}, ${hsl2.s}%, ${hsl2.l}%)`;
            } else {
              // If monochromatic, generate a darker analogous color
              secondary = `hsl(${(hsl1.h - 40 + 360) % 360}, ${hsl1.s}%, ${Math.max(20, hsl1.l - 15)}%)`;
            }

            resolve({ primary, secondary });
          } else {
            resolve(defaultColors);
          }
        } catch (e) { resolve(defaultColors); }
      };
      img.onerror = () => resolve(defaultColors);
      // Append a cache-buster query param to bypass TMDB CDN cached CORS issues
      img.src = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 'cb=' + Date.now();
    });
  }

  private rgbToHsl(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  loadMovieDetails(id: number) {
    this.tmdbService.getMovieDetails(id).subscribe({
      next: (data: any) => {
        data.reviews = this.getMockReviews();
        data.isBookmarked = false;
        // Preserve existing accentColor if we have it, else fallback to dark
        data.accentColor = this.movie()?.accentColor || '#141414';
        this.movie.set(data);
        this.suggestedPage = 1;
        this.isLoadingSuggested = false;
        // Always extract vivid color from the large backdrop image
        this.updateMovieAccentColor(data.backdropUrl || data.posterUrl);
        // Important: tell the loader the data is ready so it waits for images and hides
        this.loaderService.setRouteReady();
      },
      error: (err: any) => {
        console.error('Failed to load movie details', err);
        this.loaderService.setRouteReady();
      }
    });
  }

  private getMockReviews(): Review[] {
    return [
      {
        id: '1',
        author: 'dave_george',
        title: 'All he ever wanted to do was race...',
        content: 'Seventeen years after the passing of one of the greatest Formula 1 racing drivers of all time a documentary has been released that examines his ten-year career in the sport. Directed by Asif Kapadia (\'Far North\', \'The Warrior\') and produced by Universal and Working Title, \'Senna\' shows the audience the untapped potential and brilliance of the Formula 1 driver Ayrton Senna, while also examining the rise of this shy, young Brazillian boy; from go-karting circuits to a televisual audience of millions. \'Senna\' is as moving and touching, as it is interesting and captivating.',
        likes: 172,
        dislikes: 10,
        date: 'Jun 4, 2025'
      },
      {
        id: '2',
        author: 'the_rattlesnake25',
        title: 'Simply fantastic',
        content: 'I have just returned home from watching "Senna" and am struggling to recall a time I have ever been moved by a piece of film so much.\nWhat has been created is much more than just a documentary, it charts Ayrton\'s F1 career and gives the viewer an insight into the man, not just the public face we saw and loved so dearly on the TV.',
        likes: 70,
        dislikes: 8,
        date: 'Jun 4, 2025'
      },
      {
        id: '3',
        author: 'Traditionalmoviebuff',
        title: 'Truly Remarkable',
        content: 'I had been a Fan of Ayrton when I was a child. I distinctly remember watching the F1 highlights with my dad. My dad was a seasonal fanatic of sports and kept updating me with the news from the papers/sports magazines and the television.\nTo relive the moments of Ayrton (the idol) in this emotionally gripping documentary was unbelievably comforting. The script and flow of the events were so flawlessly presented taking one\'s memory into the Time travel of decade gone by. It was nothing short of Excellence in execution.',
        likes: 65,
        dislikes: 4,
        date: 'Jun 26, 2025'
      },
      {
        id: '4',
        author: 'racing_fan99',
        title: 'A Must Watch',
        content: 'If you love F1, this is an absolute masterpiece. The tension and the drama are perfectly captured.',
        likes: 42,
        dislikes: 1,
        date: 'Jul 2, 2025'
      },
      {
        id: '5',
        author: 'cinema_lover',
        title: 'Visually stunning',
        content: 'The archival footage is restored beautifully. Even if you don\'t care about racing, it\'s a compelling story.',
        likes: 89,
        dislikes: 3,
        date: 'Jul 15, 2025'
      }
    ];
  }

  goBack() {
    this.location.back();
  }

  submitReview() {
    const text = this.newReviewText().trim();
    if (!text) return;

    this.movie.update(m => {
      if (!m) return m;
      const newReview: Review = {
        id: Date.now().toString(),
        author: 'GuestUser',
        title: 'New Review',
        content: text,
        likes: 0,
        dislikes: 0,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
      return {
        ...m,
        reviews: [newReview, ...(m.reviews || [])]
      };
    });
    this.newReviewText.set('');
  }

  toggleReviews() {
    this.showAllReviews.update(v => !v);
  }

  toggleBookmark() {
    const m = this.movie();
    if (m) {
      this.favoritesService.toggleFavorite(m);
      this.movie.update(item => item ? { ...item, isBookmarked: !item.isBookmarked } : item);
    }
  }

  goToMovie(movie: any, overrideColor?: string) {
    this.dismissHoverPanel();
    this.loaderService.startNavigation();

    // Normalize data to prevent UI crashes if some fields are missing (e.g. from TMDB recommendations)
    const normalizedData = {
      ...movie,
      title: movie.title || movie.name || 'Titolo Sconosciuto',
      year: movie.year || (movie.release_date ? movie.release_date.substring(0, 4) : (movie.first_air_date ? movie.first_air_date.substring(0, 4) : 2024)),
      duration: movie.duration || '2h 00m',
      matchScore: movie.matchScore || '90% Match',
      genres: movie.genres || ['Azione', 'Drammatico'],
      synopsis: movie.synopsis || movie.overview || 'Nessuna sinossi disponibile.',
      backdropUrl: movie.backdropUrl || (movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : ''),
      posterUrl: movie.posterUrl || (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : ''),
      accentColor: overrideColor || movie.accentColor || movie.primaryColor || '#ff0000',
      screenshots: movie.screenshots || [
        'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1585951237318-9ea5e175b891?w=400&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=800&auto=format&fit=crop&q=80'
      ],
      cast: movie.cast || []
    };

    setTimeout(() => {
      if (movie.isSeries) {
        this.router.navigate(['/series', movie.id], { state: { data: normalizedData } });
      } else {
        this.router.navigate(['/movie', movie.id], { state: { data: normalizedData } });
      }
    }, 400);
  }

  onThemeChange(theme: 'dark' | 'light' | 'dynamic') {
    this.activeTheme.set(theme);
    if (theme === 'light') {
      document.body.style.backgroundColor = '#f3f4f6';
      document.body.style.color = '#111827';
    } else {
      document.body.style.backgroundColor = '#0a0a0a';
      document.body.style.color = '#ffffff';
    }
  }

  toRgba(hex: string, alpha: number): string {
    if (!hex) return `rgba(255,255,255,${alpha})`;
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
