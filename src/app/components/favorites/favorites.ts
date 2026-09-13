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
import { FavoritesMobile } from './favorites-mobile/favorites-mobile';

import { FavoritesService } from '../../services/favorites.service';

interface FavoriteItem {
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
}

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, FavoritesMobile],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss'
})
export class Favorites implements OnInit {
  platformId = inject(PLATFORM_ID);
  themeService = inject(ThemeService);
  router = inject(Router);
  titleService = inject(Title);
  preferencesService = inject(PreferencesService);
  loaderService = inject(LoaderService);

  favoritesService = inject(FavoritesService);

  isMobile = signal<boolean>(false);
  pageLoaded = signal<boolean>(false);

  sortOption = signal<'az' | 'recent' | 'match'>('recent');
  isSortDropdownOpen = signal<boolean>(false);
  searchQuery = signal<string>('');
  isSearchFocused = signal<boolean>(false);

  // Hero Image Data
  heroImage = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1920px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg'; // Fallback
  heroTitle = 'I Tuoi Preferiti';

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
      const items = this.favoriteItems();
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

  favoriteItems = computed(() => {
    return this.favoritesService.items().map(item => ({
      id: item.media_id,
      title: item.title,
      posterUrl: item.poster_url,
      backdropUrl: item.backdrop_url,
      isSeries: item.media_type === 'tv',
      isBookmarked: true,
      year: item.year,
      matchScore: item.matchScore,
      genres: item.genres || [],
      duration: item.duration,
      accentColor: '#3b82f6',
      synopsis: '',
      added_at: item.added_at
    })) as FavoriteItem[];
  });

  currentHeroImage = computed(() => {
    const prefId = this.preferencesService.favoritesHeroMovieId();
    const items = this.favoriteItems();
    if (items.length === 0) return this.heroImage;

    let heroMovie = items.find(m => m.id === prefId);
    if (!heroMovie) {
      heroMovie = items[0];
    }

    const url = heroMovie.backdropUrl || heroMovie.posterUrl;
    return url ? url.replace('w=500', 'w=1920') : this.heroImage;
  });

  // Computed state for filtered and sorted items
  filteredItems = computed(() => {
    let items = this.favoriteItems();

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
        // recent: order by added_at descending (which is default array order)
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
    this.titleService.setTitle('Preferiti');
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

  goToDetail(item: FavoriteItem) {
    if (item.isSeries) {
      this.router.navigate(['/series', item.id]);
    } else {
      this.router.navigate(['/movie', item.id]);
    }
  }

  removeFavorite(item: FavoriteItem, event?: Event) {
    if (event) event.stopPropagation();
    this.favoritesService.toggleFavorite({
      id: item.id,
      isSeries: item.isSeries
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
