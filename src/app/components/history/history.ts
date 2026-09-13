import { Component, OnInit, signal, computed, inject, PLATFORM_ID, effect, viewChild, ElementRef } from '@angular/core';
import autoAnimate from '@formkit/auto-animate';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../navbar/navbar';
import { ThemeService } from '../../services/theme.service';
import { PreferencesService } from '../../services/preferences.service';
import { LoaderService } from '../../services/loader.service';
import { HistoryMobile } from './history-mobile/history-mobile';

import { HistoryService } from '../../services/history.service';
import { FavoritesService } from '../../services/favorites.service';

export interface HistoryViewItem {
  id: number;
  title: string;
  year: number;
  matchScore: string;
  genres: string[];
  synopsis: string;
  posterUrl: string;
  backdropUrl?: string;
  accentColor: string;
  duration: string;
  isSeries?: boolean;
  isBookmarked?: boolean;
  watched_at?: string;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HistoryMobile],
  templateUrl: './history.html',
  styleUrl: './history.scss'
})
export class HistoryComponent implements OnInit {
  platformId = inject(PLATFORM_ID);
  themeService = inject(ThemeService);
  router = inject(Router);
  titleService = inject(Title);
  preferencesService = inject(PreferencesService);
  loaderService = inject(LoaderService);

  historyService = inject(HistoryService);
  favoritesService = inject(FavoritesService);

  isMobile = signal<boolean>(false);
  pageLoaded = signal<boolean>(false);

  sortOption = signal<'az' | 'recent' | 'match'>('recent');
  isSortDropdownOpen = signal<boolean>(false);
  searchQuery = signal<string>('');
  isSearchFocused = signal<boolean>(false);

  // Hero Image Data
  heroImage = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1920px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg'; // Fallback
  heroTitle = 'La Tua Cronologia';

  // Flawless A/B Crossfade
  heroImageA = signal<string>('');
  heroImageB = signal<string>('');
  activeHero = signal<'a' | 'b'>('a');

  gridContainer = viewChild<ElementRef>('gridContainer');

  constructor() {
    effect(() => {
      const el = this.gridContainer();
      if (el && isPlatformBrowser(this.platformId)) {
        autoAnimate(el.nativeElement, { duration: 300, easing: 'ease-out' });
      }
    });

    effect(() => {
      const items = this.historyItems();
      if (items.length === 0) {
        this.pageLoaded.set(true);
      }
    });

    effect(() => {
      const url = this.currentHeroImage();
      if (!url) return;

      if (!this.heroImageA()) {
        this.heroImageA.set(url);
        return;
      }

      if (this.heroImageA() === url || this.heroImageB() === url) return;

      if (isPlatformBrowser(this.platformId)) {
        const img = new Image();
        img.onload = () => {
          if (this.activeHero() === 'a') {
            this.heroImageB.set(url);
            this.activeHero.set('b');
          } else {
            this.heroImageA.set(url);
            this.activeHero.set('a');
          }
        };
        img.src = url;
      } else {
        this.heroImageA.set(url);
      }
    });
  }

  historyItems = computed(() => {
    const favSet = (this.favoritesService as any).favoritesSet(); // read signal
    return this.historyService.items().map(item => ({
      id: item.media_id,
      title: item.title,
      posterUrl: item.poster_url,
      backdropUrl: item.backdrop_url,
      isSeries: item.media_type === 'tv',
      year: item.year || new Date().getFullYear(),
      matchScore: item.matchScore,
      genres: item.genres || [],
      duration: item.duration,
      accentColor: '#3b82f6',
      synopsis: '',
      watched_at: item.watched_at,
      isBookmarked: favSet.has(`${item.media_type === 'tv' ? 'tv' : 'movie'}_${item.media_id}`)
    })) as HistoryViewItem[];
  });

  isMovieBookmarked(id: number, isSeries?: boolean): boolean {
    return this.favoritesService.isBookmarked(id, isSeries);
  }

  currentHeroImage = computed(() => {
    const items = this.historyItems();
    if (items.length === 0) return this.heroImage;

    const heroMovie = items[0];
    // Prefer backdrop (landscape, no zoom). Fall back to poster.
    const url = heroMovie.backdropUrl || heroMovie.posterUrl;
    return url ? url.replace('w=500', 'w=1280') : this.heroImage;
  });

  // True if the hero image is a portrait poster (no backdrop available)
  isPosterHero = computed(() => {
    const items = this.historyItems();
    if (items.length === 0) return false;
    return !items[0].backdropUrl;
  });

  // Computed state for filtered and sorted items
  filteredItems = computed(() => {
    let items = this.historyItems();

    // 1. Search Filter
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      items = items.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.genres.some(g => g.toLowerCase().includes(query))
      );
    }

    // 2. Sort Logic
    const sort = this.sortOption();
    items = [...items].sort((a, b) => {
      if (sort === 'az') {
        return a.title.localeCompare(b.title);
      } else if (sort === 'match') {
        const scoreA = parseInt(a.matchScore) || 0;
        const scoreB = parseInt(b.matchScore) || 0;
        return scoreB - scoreA;
      } else {
        // recent: order by watched_at descending (which is default array order)
        return 0;
      }
    });

    return items;
  });

  hoveredItemId = signal<number | null>(null);

  setHoveredItem(id: number | null) {
    this.hoveredItemId.set(id);
  }

  ngOnInit() {
    this.titleService.setTitle('Cronologia');
    if (isPlatformBrowser(this.platformId)) {
      this.checkScreenSize();
      window.addEventListener('resize', this.checkScreenSize.bind(this));

      this.loaderService.setRouteReady();

      // Attendi che il loader svanisca (400ms) prima di far partire le animazioni
      setTimeout(() => {
        this.pageLoaded.set(true);
      }, 350);
    }
  }

  checkScreenSize() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile.set(window.innerWidth <= 768);
    }
  }

  goToDetail(item: HistoryViewItem) {
    if (item.isSeries) {
      this.router.navigate(['/series', item.id]);
    } else {
      this.router.navigate(['/movie', item.id]);
    }
  }

  toggleFavorite(item: HistoryViewItem, event?: Event) {
    if (event) event.stopPropagation();
    this.favoritesService.toggleFavorite({
      id: item.id,
      isSeries: item.isSeries,
      title: item.title,
      posterUrl: item.posterUrl,
      backdropUrl: item.backdropUrl
    });
  }

  toggleSortDropdown() {
    this.isSortDropdownOpen.update(val => !val);
  }

  onSearchInput(value: string) {
    this.searchQuery.set(value);
  }

  selectSortOption(option: 'az' | 'recent' | 'match') {
    this.sortOption.set(option);
    this.isSortDropdownOpen.set(false);
  }

  get currentSortLabel(): string {
    const map = {
      'az': 'Titolo (A-Z)',
      'recent': 'Più recenti',
      'match': 'Miglior Match'
    };
    return map[this.sortOption()];
  }

}
