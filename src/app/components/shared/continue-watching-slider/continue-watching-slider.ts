import { Component, ElementRef, signal, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

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

@Component({
  selector: 'app-continue-watching-slider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './continue-watching-slider.html',
  styleUrl: './continue-watching-slider.scss'
})
export class ContinueWatchingSliderComponent {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

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

  canScrollRightContinue = signal<boolean>(true);
  canScrollLeftContinue = signal<boolean>(false);

  episodeGlow = signal<{ x: number, y: number, color: string, isHovered: boolean }>({ x: 0, y: 0, color: 'transparent', isHovered: false });
  episodeGlowHideTimer: any;
  globalScrollCleanup: any;

  scrollSlider(containerId: string, direction: 'left' | 'right') {
    if (!this.isBrowser || typeof document === 'undefined') return;

    const el = document.getElementById(containerId);
    if (el) {
      const scrollAmount = direction === 'left' ? -460 : 460;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  checkScrollState(containerId: string) {
    if (!this.isBrowser || typeof document === 'undefined') return;
    const el = document.getElementById(containerId);
    if (el) {
      const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 10;
      const canLeft = el.scrollLeft > 10;

      if (containerId === 'continue-slider') {
        this.canScrollRightContinue.set(canRight);
        this.canScrollLeftContinue.set(canLeft);
      }
    }
  }

  onEpisodeEnter(event: MouseEvent, color: string) {
    if (!this.isBrowser) return;
    if (this.episodeGlowHideTimer) {
      clearTimeout(this.episodeGlowHideTimer);
      this.episodeGlowHideTimer = null;
    }

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    // Center of the hovered card relative to the viewport
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    this.episodeGlow.set({
      x: centerX,
      y: centerY,
      color: color,
      isHovered: true
    });
  }

  onEpisodeLeave() {
    if (this.episodeGlowHideTimer) {
      clearTimeout(this.episodeGlowHideTimer);
    }
    this.episodeGlowHideTimer = setTimeout(() => {
      this.episodeGlow.update(glow => ({ ...glow, isHovered: false }));
      this.episodeGlowHideTimer = null;
    }, 150); // slight debounce prevents flickering when moving between cards
  }

  togglePlayState(item: ContinueWatchingItem) {
    item.isPlaying = !item.isPlaying;
  }
}
