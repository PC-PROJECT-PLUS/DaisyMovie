import { Component, Input, Output, EventEmitter, signal, computed, inject, PLATFORM_ID, OnChanges, SimpleChanges, HostListener, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TmdbService } from '../../services/tmdb.service';

export interface PlayerConfig {
  id: number;
  type: 'movie' | 'tv';
  accentColor?: string;
  season?: number;
  episode?: number;
  startAt?: number; // seconds
  isAnime?: boolean;
}

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-player.html',
  styleUrl: './video-player.scss'
})
export class VideoPlayerComponent implements OnChanges, OnDestroy {
  @Input() config: PlayerConfig | null = null;
  @Input() visible = false;
  @Output() closed = new EventEmitter<void>();

  private sanitizer = inject(DomSanitizer);
  private platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);

  animState = signal<'entering' | 'visible' | 'leaving' | 'hidden'>('hidden');
  iframeReady = signal(false);
  safeUrl = signal<SafeResourceUrl | null>(null);

  private tmdbService = inject(TmdbService);
  tvEpisodes = signal<any[]>([]);
  showEpisodesDropdown = signal(false);
  totalSeasons = signal<number>(1);
  currentSeason = signal<number>(1);
  isFullscreen = signal(false);

  private leaveTimeout: any;
  private enterTimeout: any;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']) {
      if (this.visible && this.config) {
        if (this.config.type === 'tv' && this.config.season !== undefined) {
          this.currentSeason.set(this.config.season);
        }
        this.open();
      } else if (!this.visible) {
        this.close();
      }
    }
    if (changes['config'] && this.config && this.visible) {
      this.buildUrl();
      this.fetchSeriesData();
    }
  }

  private fetchSeriesData() {
    if (this.config && this.config.type === 'tv') {
      this.tmdbService.getSeriesDetails(this.config.id).subscribe(details => {
        this.totalSeasons.set(details.number_of_seasons || 1);
        this.fetchEpisodes(this.currentSeason());
      });
    } else {
      this.tvEpisodes.set([]);
    }
  }

  private fetchEpisodes(seasonNum: number) {
    if (this.config && this.config.type === 'tv') {
      this.tmdbService.getSeasonEpisodes(this.config.id, seasonNum).subscribe(eps => {
        const todayStr = new Date().toISOString().split('T')[0];
        const aired = eps.filter(ep => ep.airDate && ep.airDate <= todayStr);
        this.tvEpisodes.set(aired);
      });
    }
  }

  changeSeason(s: number) {
    this.currentSeason.set(s);
    this.fetchEpisodes(s);
  }

  goToEpisode(epNumber: number, seasonNumber?: number) {
    if (!this.config) return;
    const sNum = seasonNumber || this.currentSeason();
    this.config = { ...this.config, episode: epNumber, season: sNum };
    this.currentSeason.set(sNum);
    this.showEpisodesDropdown.set(false);
    this.iframeReady.set(false);
    this.buildUrl();
  }

  nextEpisode() {
    if (!this.config || this.config.type !== 'tv') return;
    const eps = this.tvEpisodes();
    const currentEp = this.config.episode || 1;
    const curSeason = this.currentSeason();
    
    // Check if there is a next episode in the current season
    if (eps.find(e => e.episodeNumber === currentEp + 1)) {
      this.goToEpisode(currentEp + 1, curSeason);
    } else if (curSeason < this.totalSeasons()) {
      // Go to episode 1 of next season
      this.goToEpisode(1, curSeason + 1);
    }
  }

  prevEpisode() {
    if (!this.config || this.config.type !== 'tv') return;
    const currentEp = this.config.episode || 1;
    const curSeason = this.currentSeason();
    
    if (currentEp > 1) {
      this.goToEpisode(currentEp - 1, curSeason);
    } else if (curSeason > 1) {
      // Simplification: Go to episode 1 of previous season (since we don't immediately know how many episodes are in the previous season without fetching)
      this.goToEpisode(1, curSeason - 1);
    }
  }

  private handleIframeMessage(event: MessageEvent) {
    if (this.safeUrl()) {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.type === 'PLAYER_EVENT' && data.data) {
          const vixData = data.data;
          if (vixData.event === 'timeupdate' || vixData.event === 'pause') {
            // Salviamo nel localStorage
            localStorage.setItem('vixsrc_time_debug', String(Math.floor(vixData.currentTime)));
          }
        }
      } catch (e) {
        // Not JSON
      }
    }
  }

  showDebugTime() {
    if (isPlatformBrowser(this.platformId)) {
      const time = localStorage.getItem('vixsrc_time_debug');
      alert(time ? `Il tempo salvato è: ${time} secondi!` : 'Nessun tempo salvato ancora.');
    }
  }

  ngOnDestroy() {
    clearTimeout(this.leaveTimeout);
    clearTimeout(this.enterTimeout);
    this.unlockBodyScroll();
  }

  private buildUrl() {
    if (!this.config) return;
    const { id, type, accentColor, season, episode, startAt, isAnime } = this.config;

    // Convert accent color to hex if it's in HSL format, or strip # if it's already hex
    let hex = 'E50914'; // Fallback to Netflix Red
    if (accentColor && accentColor !== '#0075ff' && accentColor !== '#141414') {
      if (accentColor.startsWith('hsl')) {
        hex = this.hslToHex(accentColor);
      } else {
        hex = accentColor.replace('#', '');
      }
    }
    hex = hex.toUpperCase();

    // ─── Scelta del Provider ───
    let provider: string = isAnime ? 'vidsrc' : 'vixsrc';

    let base: string = '';
    const params = new URLSearchParams();

    const s = season ?? 1;
    const e = episode ?? 1;

    switch (provider) {
      case 'vixsrc':
        // VixSrc (Supporta Colori, Sottotitoli, Minutaggio e PostMessage!)
        base = type === 'movie' ? `https://vixsrc.to/movie/${id}` : `https://vixsrc.to/tv/${id}/${s}/${e}`;
        params.set('autoplay', 'true');
        params.set('primaryColor', hex);
        params.set('lang', 'it');
        if (startAt && startAt > 0) {
          params.set('startAt', String(startAt));
        }
        break;

      case 'vidlink':
        // VidLink (Ottimo aggregatore alternativo)
        base = type === 'movie' ? `https://vidlink.pro/movie/${id}` : `https://vidlink.pro/tv/${id}/${s}/${e}`;
        params.set('autoplay', 'true');
        params.set('primaryColor', hex);
        break;

      case 'vidsrc':
        // VidSrc Ufficiale (ID nel percorso, con stanghetta finale)
        base = type === 'movie' ? `https://vidsrc.sbs/embed/movie/${id}` : `https://vidsrc.sbs/embed/tv/${id}/${s}/${e}/`;
        params.set('autoplay', '1');
        params.set('color', hex);
        params.set('sub', 'it');
        break;

      case 'vidcore':
        // VidCore (Niente ads, ma meno opzioni per i sottotitoli)
        base = type === 'movie' ? `https://vidcore.org/embed/movie/${id}` : `https://vidcore.org/embed/tv/${id}/${s}/${e}`;
        params.set('autoplay', 'true');
        params.set('theme', hex);
        params.set('lang', 'it');
        break;
    }

    if (provider !== 'vixsrc' && startAt && startAt > 0) {
      params.set('t', String(startAt));
      params.set('startAt', String(startAt));
    }

    // Costruisci l'url finale (se params è vuoto non aggiungere il ?)
    const queryString = params.toString();
    const url = queryString ? `${base}?${queryString}` : base;

    console.log('[VideoPlayer] Opening Player URL:', url);
    this.safeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
  }

  private open() {
    this.buildUrl();
    this.iframeReady.set(false);
    this.lockBodyScroll();

    clearTimeout(this.leaveTimeout);
    this.animState.set('entering');

    this.enterTimeout = setTimeout(() => {
      this.animState.set('visible');
    }, 20); // Allow browser to paint first frame
  }

  private close() {
    this.animState.set('leaving');
    clearTimeout(this.leaveTimeout);
    this.leaveTimeout = setTimeout(() => {
      this.animState.set('hidden');
      this.safeUrl.set(null); // Destroy iframe to stop playback
      this.unlockBodyScroll();
    }, 400);
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('player-backdrop')) {
      this.requestClose();
    }
  }

  @HostListener('document:keydown.escape')
  requestClose() {
    if (this.isFullscreen() && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      this.isFullscreen.set(false);
    }
    this.closed.emit();
  }

  toggleFullscreen() {
    if (!this.isBrowser) return;
    const container = document.querySelector('.player-container');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        this.isFullscreen.set(true);
      }).catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        this.isFullscreen.set(false);
      }).catch(err => {});
    }
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange() {
    if (this.isBrowser) {
      this.isFullscreen.set(!!document.fullscreenElement);
    }
  }

  onIframeLoad() {
    this.iframeReady.set(true);
  }

  @HostListener('window:message', ['$event'])
  onMessage(event: MessageEvent) {
    if (event.origin.includes('vixsrc') || event.origin.includes('vidsrc')) {
      try {
        let payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (payload && payload.type === 'PLAYER_EVENT' && payload.event?.event === 'timeupdate') {
          const currentTime = Math.floor(payload.event.currentTime);
          if (currentTime > 0 && this.config?.id) {
            const key = this.config.type === 'movie'
              ? `daisy-progress-movie-${this.config.id}`
              : `daisy-progress-tv-${this.config.id}-${this.config.season}-${this.config.episode}`;

            // Save time to local storage
            localStorage.setItem(key, currentTime.toString());
          }
        }
      } catch (e) {
        // Ignore JSON parse errors for other random messages
      }
    }
  }

  private lockBodyScroll() {
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  private unlockBodyScroll() {
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  get accentGlow(): string {
    const color = this.config?.accentColor || '#0075ff';
    return color;
  }

  private hslToHex(hslStr: string): string {
    // Parse hsl(230, 80%, 50%) or hsl(230, 28.5%, 42.9%)
    const match = hslStr.match(/hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
    if (!match) return 'E50914'; // Fallback to Netflix Red if parsing fails

    let h = parseFloat(match[1]) % 360;
    let s = parseFloat(match[2]) / 100;
    let l = parseFloat(match[3]) / 100;

    let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs((h / 60) % 2 - 1)),
      m = l - c / 2,
      r = 0,
      g = 0,
      b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
  }
  get currentEpisodeNumber(): number | undefined {
    return this.config?.episode;
  }
}
