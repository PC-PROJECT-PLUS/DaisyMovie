import { Component, OnInit, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FooterComponent } from '../footer/footer';
import { ResponsiveService } from '../../services/responsive';
import { SeriesDetailMobile } from './series-detail-mobile/series-detail-mobile';

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
  releaseDate: string;
  cast: CastMember[];
  screenshots: string[];
  reviews: Review[];
  episodes: Episode[];
  isBookmarked: boolean;
  secondaryColor?: string;
}

@Component({
  selector: 'app-series-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, FooterComponent, SeriesDetailMobile],
  templateUrl: './series-detail.html',
  styleUrl: './series-detail.scss'
})
export class SeriesDetailComponent implements OnInit {
  public responsiveService = inject(ResponsiveService);
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

  // Mock data for suggested movies
  suggestedMovies: any[] = [
    { id: '10', title: 'Drive', posterUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&q=80', year: 2011, duration: '1h 40m', genres: ['Action', 'Crime'], synopsis: 'A Hollywood stunt driver who moonlights as a getaway driver is lured into a dangerous heist.' },
    { id: '11', title: 'Rush', posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80', year: 2013, duration: '2h 3m', genres: ['Biography', 'Drama', 'Sport'], synopsis: 'The merciless 1970s rivalry between Formula One rivals James Hunt and Niki Lauda.' },
    { id: '12', title: 'Le Mans 66', posterUrl: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=400&q=80', year: 2019, duration: '2h 32m', genres: ['Action', 'Drama'], synopsis: 'American car designer Carroll Shelby and driver Ken Miles battle corporate interference to build a revolutionary race car for Ford.' },
    { id: '13', title: 'Top Gun', posterUrl: 'https://images.unsplash.com/photo-1585951237318-9ea5e175b891?w=400&q=80', year: 1986, duration: '1h 50m', genres: ['Action', 'Drama'], synopsis: 'As students at the United States Navy\'s elite fighter weapons school compete to be best in the class, one daring young pilot learns a few things from a civilian instructor.' },
    { id: '14', title: 'Days of Thunder', posterUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&q=80', year: 1990, duration: '1h 47m', genres: ['Action', 'Drama'], synopsis: 'A young hot-shot stock car driver gets his chance to compete at the top level.' },
    { id: '15', title: 'Grand Prix', posterUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&q=80', year: 1966, duration: '2h 56m', genres: ['Drama', 'Sport'], synopsis: 'American Grand Prix driver Pete Aron is fired by his Jordan-BRM racing team after a crash at Monaco that injures his British teammate, Scott Stoddard.' },
    { id: '16', title: 'Baby Driver', posterUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&q=80', year: 2017, duration: '1h 53m', genres: ['Action', 'Crime'], synopsis: 'After being coerced into working for a crime boss, a young getaway driver finds himself taking part in a heist doomed to fail.' },
    { id: '17', title: 'Need for Speed', posterUrl: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400&q=80', year: 2014, duration: '2h 10m', genres: ['Action', 'Crime'], synopsis: 'Fresh from prison, a street racer who was framed by a wealthy business associate joins a cross country race with revenge in mind.' }
  ];

  // EPISODE SLIDER AND DROPDOWN STATE
  isDropdownOpen = signal<boolean>(false);
  activeSeason = signal<number>(1);
  showLeftArrowEpisodes = signal<boolean>(false);
  showRightArrowEpisodes = signal<boolean>(true);

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
              stateData.episodes = [
                { id: 101, episodeNumber: 1, title: 'Episode 1', duration: '45m', thumbnailUrl: 'https://images.unsplash.com/photo-1614749219355-6b43d6c14175?w=400&auto=format&fit=crop&q=80', synopsis: 'Pilot episode.' },
                { id: 102, episodeNumber: 2, title: 'Episode 2', duration: '43m', thumbnailUrl: 'https://images.unsplash.com/photo-1574676451642-171b3e8a4a58?w=400&auto=format&fit=crop&q=80', synopsis: 'Second episode.' },
                { id: 103, episodeNumber: 3, title: 'Episode 3', duration: '46m', thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&auto=format&fit=crop&q=80', synopsis: 'The plot thickens.' },
                { id: 104, episodeNumber: 4, title: 'Episode 4', duration: '44m', thumbnailUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&auto=format&fit=crop&q=80', synopsis: 'A surprising turn of events.' },
                { id: 105, episodeNumber: 5, title: 'Episode 5', duration: '42m', thumbnailUrl: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=400&auto=format&fit=crop&q=80', synopsis: 'Characters face their fears.' },
                { id: 106, episodeNumber: 6, title: 'Episode 6', duration: '48m', thumbnailUrl: 'https://images.unsplash.com/photo-1585951237318-9ea5e175b891?w=400&auto=format&fit=crop&q=80', synopsis: 'The climax approaches.' },
                { id: 107, episodeNumber: 7, title: 'Episode 7', duration: '41m', thumbnailUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&auto=format&fit=crop&q=80', synopsis: 'Final preparations.' },
                { id: 108, episodeNumber: 8, title: 'Episode 8', duration: '50m', thumbnailUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&auto=format&fit=crop&q=80', synopsis: 'Season finale.' },
                { id: 109, episodeNumber: 9, title: 'Episode 9', duration: '45m', thumbnailUrl: 'https://images.unsplash.com/photo-1608889476518-738c9b1dcb40?w=400&auto=format&fit=crop&q=80', synopsis: 'New beginnings.' },
                { id: 110, episodeNumber: 10, title: 'Episode 10', duration: '47m', thumbnailUrl: 'https://images.unsplash.com/photo-1574676451642-171b3e8a4a58?w=400&auto=format&fit=crop&q=80', synopsis: 'Unexpected allies.' },
                { id: 111, episodeNumber: 11, title: 'Episode 11', duration: '49m', thumbnailUrl: 'https://images.unsplash.com/photo-1614749219355-6b43d6c14175?w=400&auto=format&fit=crop&q=80', synopsis: 'A hidden truth.' },
                { id: 112, episodeNumber: 12, title: 'Episode 12', duration: '44m', thumbnailUrl: 'https://images.unsplash.com/photo-1506744626753-1fa30fd20055?w=400&auto=format&fit=crop&q=80', synopsis: 'The final confrontation.' },
                { id: 113, episodeNumber: 13, title: 'Episode 13', duration: '45m', thumbnailUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&auto=format&fit=crop&q=80', synopsis: 'Unveiling the past.' },
                { id: 114, episodeNumber: 14, title: 'Episode 14', duration: '43m', thumbnailUrl: 'https://images.unsplash.com/photo-1585951237318-9ea5e175b891?w=400&auto=format&fit=crop&q=80', synopsis: 'A risky plan.' },
                { id: 115, episodeNumber: 15, title: 'Episode 15', duration: '46m', thumbnailUrl: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=400&auto=format&fit=crop&q=80', synopsis: 'The ultimate truth revealed.' }
              ];
            }
            this.series.set(stateData);
            this.updateMovieAccentColor(stateData.backdropUrl);
            return;
          }
        }
        this.loadSeriesDetails(Number(id));
      }
    });

    // Trigger entrance animations after a slight delay
    setTimeout(() => {
      this.pageLoaded.set(true);
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
    }, 100);
  }

  ngOnDestroy() {
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

    // Check Suggested slider
    const elSug = document.getElementById('suggested-slider');
    if (elSug) {
      const canRight = elSug.scrollLeft + elSug.clientWidth < elSug.scrollWidth - 10;
      const canLeft = elSug.scrollLeft > 10;
      this.canScrollRightSuggested.set(canRight);
      this.canScrollLeftSuggested.set(canLeft);
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
      img.src = imageUrl;
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
    // Generate dummy data based on ID to simulate a real fetch
    this.series.set({
      id: id,
      title: 'ARCANE (Demo)',
      year: 2021,
      episodeDuration: '40m / ep',
      totalDuration: '6h 40m',
      matchScore: '99% Match',
      genres: ['Action', 'Mystery', 'Thriller'],
      synopsis: 'Two highly trained elite snipers are assigned to guard opposite sides of a mysterious, lethal canyon, protecting the world from an unspeakable danger lurking within. As days turn into weeks, they must survive not only the harsh conditions but also the psychological toll of isolation and paranoia.',
      backdropUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=1600&auto=format&fit=crop&q=80',
      posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
      accentColor: '#ff5e00',
      director: 'Joseph Kosinski',
      producer: 'Brad Pitt, Joseph Kosinski, Lewis Hamilton, Jerry Bruckheimer, Chad Oman, Dede Gardner, Jeremy Kleiner',
      music: 'Hans Zimmer',
      productionCompanies: 'Dawn Apollo Films, Apple Original Films',
      distributedBy: 'Apple TV+, Warner Bros. Pictures',
      editedBy: 'Stephen Mirrione',
      writers: 'Ehren Kruger, Eric Warren Singer, Christopher McQuarrie',
      cinematography: 'Claudio Miranda',
      budget: '$90,000,000',
      boxOffice: 'N/A',
      languages: 'English',
      releaseDate: 'November 6, 2021',
      episodes: [
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
      ],
      cast: [
        { name: 'Brad Pitt', character: 'Sonny Hayes', imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
        { name: 'Damson Idris', character: 'Joshua Pearce', imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
        { name: 'Javier Bardem', character: 'Team Owner', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
        { name: 'Kerry Condon', character: 'Engineer', imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
        { name: 'Tobias Menzies', character: 'Rival Driver', imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
        { name: 'Sarah Niles', character: 'Team Boss', imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80' },
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
      screenshots: [
        'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1585951237318-9ea5e175b891?w=400&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=800&auto=format&fit=crop&q=80'
      ],
      reviews: this.getMockReviews(),
      isBookmarked: false
    });
    this.updateMovieAccentColor('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&auto=format&fit=crop&q=80');
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
