import { Component, OnInit, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FooterComponent } from '../footer/footer';
import { ResponsiveService } from '../../services/responsive';
import { SeriesDetailMobile } from './series-detail-mobile/series-detail-mobile';
import { LoaderService } from '../../services/loader.service';
import { TmdbService } from '../../services/tmdb.service';
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

export interface Episode {
  id: number;
  episodeNumber: number;
  title: string;
  duration: string;
  thumbnailUrl: string;
  synopsis: string;
}

export interface SeriesDetail {
  id: number;
  title: string;
  year: number;
  episodeDuration: string;
  totalDuration: string;
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
  episodes: Episode[];
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
  selector: 'app-series-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, FooterComponent, SeriesDetailMobile, VideoPlayerComponent],
  templateUrl: './series-detail.html',
  styleUrl: './series-detail.scss'
})
export class SeriesDetailComponent implements OnInit {
  public responsiveService = inject(ResponsiveService);
  private loaderService = inject(LoaderService);
  private tmdbService = inject(TmdbService);
  seriesId = signal<number | null>(null);
  series = signal<SeriesDetail | null>(null);
  activeTheme = signal<'dark' | 'light' | 'dynamic'>('dark');
  pageLoaded = signal<boolean>(false);

  // Slider edge fade signals
  canScrollRightCast = signal<boolean>(true);
  canScrollLeftCast = signal<boolean>(false);

  canScrollRightSuggested = signal<boolean>(true);
  canScrollLeftSuggested = signal<boolean>(false);

  newReviewText = signal<string>('');
  showAllReviews = signal<boolean>(false);

  // Suggested pagination
  suggestedPage = 1;
  isLoadingSuggested = false;

  // EPISODE SLIDER AND DROPDOWN STATE
  isDropdownOpen = signal<boolean>(false);
  activeSeason = signal<number>(1);
  showLeftArrowEpisodes = signal<boolean>(false);
  showRightArrowEpisodes = signal<boolean>(true);

  // Real seasons and episodes from TMDB
  seasons = signal<number[]>([1]);
  episodesBySeason = signal<Map<number, any[]>>(new Map());
  activeEpisodes = signal<any[]>([]);
  isLoadingEpisodes = signal<boolean>(false);
  episodesAnimState = signal<'idle' | 'out' | 'in'>('idle');

  // VIDEO PLAYER STATE
  playerVisible = signal(false);
  playerConfig = signal<PlayerConfig | null>(null);

  async openPlayer() {
    const s = this.series();
    if (!s) return;

    let accentColor = '#E50914';
    try {
      const imageUrl = s.backdropUrl || s.posterUrl;
      if (imageUrl && isPlatformBrowser(this.platformId)) {
        const colors = await this.extractDominantColors(imageUrl);
        if (colors.primary.startsWith('hsl')) accentColor = colors.primary;
      }
    } catch (e) { }

    let startAt = 0;
    if (isPlatformBrowser(this.platformId)) {
      const savedTime = localStorage.getItem(`daisy-progress-tv-${s.id}-${this.activeSeason()}-1`);
      if (savedTime) startAt = parseInt(savedTime, 10);
    }

    const genresStr = JSON.stringify(s.genres || []).toLowerCase();
    const isAnimation = genresStr.includes('anim');

    const prodStr = JSON.stringify(s.productionCompanies || '').toLowerCase();
    const countryStr = JSON.stringify(s.origin_country || s.originCountry || '').toLowerCase();
    const origLangStr = JSON.stringify(s.original_language || s.originalLanguage || '').toLowerCase();

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
      id: s.id,
      type: 'tv',
      accentColor,
      season: this.activeSeason(),
      episode: 1,
      startAt: startAt > 0 ? startAt : undefined,
      isAnime
    });
    this.playerVisible.set(true);
  }

  async openEpisodePlayer(episodeNumber: number) {
    const s = this.series();
    if (!s) return;

    let accentColor = '#E50914';
    try {
      const imageUrl = s.backdropUrl || s.posterUrl;
      if (imageUrl && isPlatformBrowser(this.platformId)) {
        const colors = await this.extractDominantColors(imageUrl);
        if (colors.primary.startsWith('hsl')) accentColor = colors.primary;
      }
    } catch (e) { }

    let startAt = 0;
    if (isPlatformBrowser(this.platformId)) {
      const savedTime = localStorage.getItem(`daisy-progress-tv-${s.id}-${this.activeSeason()}-${episodeNumber}`);
      if (savedTime) startAt = parseInt(savedTime, 10);
    }

    const genresStr = JSON.stringify(s.genres || []).toLowerCase();
    const isAnimation = genresStr.includes('anim');

    const prodStr = JSON.stringify(s.productionCompanies || '').toLowerCase();
    const countryStr = JSON.stringify(s.origin_country || s.originCountry || '').toLowerCase();
    const origLangStr = JSON.stringify(s.original_language || s.originalLanguage || '').toLowerCase();

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
      id: s.id,
      type: 'tv',
      accentColor,
      season: this.activeSeason(),
      episode: episodeNumber,
      startAt: startAt > 0 ? startAt : undefined,
      isAnime
    });
    this.playerVisible.set(true);
  }

  // HOVER PANEL STATE
  panelSeries = signal<any | null>(null);
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
        this.seriesId.set(Number(id));
        if (isPlatformBrowser(this.platformId)) {
          const stateData = window.history.state?.data;
          if (stateData && stateData.id === Number(id)) {
            if (!stateData.reviews) {
              stateData.reviews = this.getMockReviews();
            }
            if (!stateData.episodes) {
              // Ensure we have episodes and duration fields
              stateData.episodeDuration = '45m / ep';
              stateData.totalDuration = '10h 30m';
              stateData.episodes = [];
            }
            stateData.accentColor = stateData.accentColor || '#141414';
            this.series.set(stateData);
            this.updateMovieAccentColor(stateData.backdropUrl || stateData.posterUrl);
          }
        }
        // Always fetch the full details to populate the 'Più informazioni' section
        this.loadSeriesDetails(Number(id));
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
        const id = this.seriesId();
        if (id) {
          this.tmdbService.getRecommendations('tv', id, this.suggestedPage).subscribe({
            next: (data: any[]) => {
              if (data && data.length > 0) {
                this.series.update(m => {
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

    // Check Episodes slider
    const elEp = document.getElementById('episodes-slider');
    if (elEp) {
      const canRight = elEp.scrollLeft + elEp.clientWidth < elEp.scrollWidth - 10;
      const canLeft = elEp.scrollLeft > 10;
      this.showRightArrowEpisodes.set(canRight);
      this.showLeftArrowEpisodes.set(canLeft);
    }
  }

  scrollEpisodes(direction: 'left' | 'right') {
    if (!this.isBrowser || typeof document === 'undefined') return;
    const el = document.getElementById('episodes-slider');
    if (el) {
      const scrollAmount = direction === 'left' ? -600 : 600;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(() => this.checkScrollState(), 400);
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
        this.panelSeries.set(movie);
        this.panelPos.set(calcPos());
        this.isPanelSwitching.set(false);
        this.extractDominantColors(movie.posterUrl).then(c => this.panelAccentColor.set(c.primary));
        requestAnimationFrame(() => this.isPanelVisible.set(true));
      }, 120);
    } else {
      this.showTimer = setTimeout(() => {
        this.panelSeries.set(movie);
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
      this.series.update(m => {
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

  loadSeriesDetails(id: number) {
    this.tmdbService.getSeriesDetails(id).subscribe({
      next: (data: any) => {
        data.reviews = this.getMockReviews();
        data.isBookmarked = false;

        // Add specific series fields
        data.episodeDuration = data.duration;
        data.seasonsCount = data.number_of_seasons || 1;
        data.episodesCount = data.number_of_episodes || 10;
        data.totalDuration = `${Math.floor(data.episodesCount * 45 / 60)}h ${data.episodesCount * 45 % 60}m`;
        // Episodes will be loaded per-season, start with empty
        data.episodes = [];

        // Build real seasons list (exclude season 0 = Specials)
        const numSeasons = data.number_of_seasons || 1;
        const seasonList = Array.from({ length: numSeasons }, (_, i) => i + 1);
        this.seasons.set(seasonList);
        this.activeSeason.set(1);
        this.episodesBySeason.set(new Map());

        // Preserve existing accentColor if we have it, else fallback to dark
        data.accentColor = this.series()?.accentColor || '#141414';
        this.series.set(data);
        this.suggestedPage = 1;
        this.isLoadingSuggested = false;
        this.updateMovieAccentColor(data.backdropUrl || data.posterUrl);

        // Load first season episodes immediately
        this.loadSeasonEpisodes(id, 1);

        this.loaderService.setRouteReady();
        this.pageLoaded.set(true);
      },
      error: (err: any) => {
        console.error('Failed to load series details', err);
        this.loaderService.setRouteReady();
        this.pageLoaded.set(true);
      }
    });
  }

  loadSeasonEpisodes(seriesId: number, seasonNumber: number) {
    // Check cache first
    const cached = this.episodesBySeason();
    if (cached.has(seasonNumber)) {
      this.showEpisodesWithAnimation(cached.get(seasonNumber) || []);
      return;
    }

    this.isLoadingEpisodes.set(true);
    this.tmdbService.getSeasonEpisodes(seriesId, seasonNumber).subscribe({
      next: (episodes: any[]) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const airedEpisodes = episodes.filter(ep => {
          if (!ep.airDate) return false;
          return ep.airDate <= todayStr;
        });

        const updated = new Map(this.episodesBySeason());
        updated.set(seasonNumber, airedEpisodes);
        this.episodesBySeason.set(updated);
        this.isLoadingEpisodes.set(false);
        this.showEpisodesWithAnimation(airedEpisodes);
      },
      error: () => {
        this.isLoadingEpisodes.set(false);
      }
    });
  }

  private showEpisodesWithAnimation(episodes: any[]) {
    if (!this.isBrowser) {
      this.activeEpisodes.set(episodes);
      return;
    }
    const slider = document.getElementById('episodes-slider');
    if (!slider) {
      this.activeEpisodes.set(episodes);
      return;
    }

    // Phase 1: fade out current episodes
    this.episodesAnimState.set('out');

    setTimeout(() => {
      // Phase 2: swap data and reset scroll while invisible
      this.activeEpisodes.set(episodes);
      slider.scrollLeft = 0;
      this.episodesAnimState.set('in');

      // Phase 3: trigger reflow so the browser registers the class, then fade in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.episodesAnimState.set('idle');
          setTimeout(() => this.checkScrollState(), 300);
        });
      });
    }, 260);
  }

  changeSeason(seasonNumber: number) {
    this.activeSeason.set(seasonNumber);
    this.isDropdownOpen.set(false);
    const id = this.seriesId();
    if (id) {
      this.loadSeasonEpisodes(id, seasonNumber);
    }
  }

  private getMockEpisodes(): any[] {
    return [
      { id: 101, episodeNumber: 1, title: 'Welcome to the Playground', duration: '43m', thumbnailUrl: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=500&auto=format&fit=crop&q=80', synopsis: 'Orphaned sisters Vi and Powder bring trouble to Zaun\'s underground streets in the wake of a heist in posh Piltover.' },
      { id: 102, episodeNumber: 2, title: 'Some Mysteries Are Better Left Unsolved', duration: '40m', thumbnailUrl: 'https://images.unsplash.com/photo-1550100136-e092101726f4?w=500&auto=format&fit=crop&q=80', synopsis: 'Idealistic inventor Jayce attempts to harness magic through science—despite his mentor\'s warnings.' },
      { id: 103, episodeNumber: 3, title: 'The Base Violence Necessary for Change', duration: '44m', thumbnailUrl: 'https://images.unsplash.com/photo-1608889476518-738c9b1dcb40?w=500&auto=format&fit=crop&q=80', synopsis: 'An epic showdown between old rivals results in a fateful moment for Zaun. Jayce and Viktor risk it all for their research.' },
      { id: 104, episodeNumber: 4, title: 'Happy Progress Day!', duration: '40m', thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', synopsis: 'With Piltover prospering from their technology, Jayce and Viktor weigh their next move. A familiar face re-emerges from Zaun.' },
      { id: 105, episodeNumber: 5, title: 'Everybody Wants to Be My Enemy', duration: '42m', thumbnailUrl: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=400&auto=format&fit=crop&q=80', synopsis: 'Characters face their fears.' },
      { id: 106, episodeNumber: 6, title: 'When These Walls Come Tumbling Down', duration: '48m', thumbnailUrl: 'https://images.unsplash.com/photo-1585951237318-9ea5e175b891?w=400&auto=format&fit=crop&q=80', synopsis: 'The climax approaches.' },
      { id: 107, episodeNumber: 7, title: 'The Boy Savior', duration: '41m', thumbnailUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&auto=format&fit=crop&q=80', synopsis: 'Final preparations.' },
      { id: 108, episodeNumber: 8, title: 'Oil and Water', duration: '50m', thumbnailUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&auto=format&fit=crop&q=80', synopsis: 'Season finale part 1.' },
      { id: 109, episodeNumber: 9, title: 'The Monster You Created', duration: '45m', thumbnailUrl: 'https://images.unsplash.com/photo-1608889476518-738c9b1dcb40?w=400&auto=format&fit=crop&q=80', synopsis: 'Season finale part 2.' },
      { id: 110, episodeNumber: 10, title: 'New Alliances', duration: '47m', thumbnailUrl: 'https://images.unsplash.com/photo-1574676451642-171b3e8a4a58?w=400&auto=format&fit=crop&q=80', synopsis: 'Unexpected allies.' },
      { id: 111, episodeNumber: 11, title: 'The Cost of Progress', duration: '49m', thumbnailUrl: 'https://images.unsplash.com/photo-1614749219355-6b43d6c14175?w=400&auto=format&fit=crop&q=80', synopsis: 'A hidden truth.' },
      { id: 112, episodeNumber: 12, title: 'Reckoning', duration: '44m', thumbnailUrl: 'https://images.unsplash.com/photo-1506744626753-1fa30fd20055?w=400&auto=format&fit=crop&q=80', synopsis: 'The final confrontation.' }
    ];
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

    this.series.update(m => {
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
    const current = this.series();
    if (current) {
      this.series.update(m => ({ ...m!, isBookmarked: !m!.isBookmarked }));
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
