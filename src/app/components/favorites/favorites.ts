import { Component, OnInit, signal, computed, inject, PLATFORM_ID, effect, viewChild, ElementRef, HostListener } from '@angular/core';
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

  // Collections
  activeCollectionId = signal<number | null>(null);
  isCreatingCollection = signal<boolean>(false);
  newCollectionName = signal<string>('');

  isSidebarOpen = signal<boolean>(false);

  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  activeCollectionName = computed(() => {
    const id = this.activeCollectionId();
    if (id === null) return this.heroTitle;
    const col = this.favoritesService.collections().find(c => c.id === id);
    return col ? col.name : this.heroTitle;
  });

  gridContainer = viewChild<ElementRef>('gridContainer');
  sidebarPanel = viewChild<ElementRef>('sidebarPanel');
  fabButton = viewChild<ElementRef>('fabButton');

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.isSidebarOpen()) return;
    const sidebar = this.sidebarPanel()?.nativeElement;
    const fab = this.fabButton()?.nativeElement;

    if (sidebar && fab) {
      if (!sidebar.contains(event.target as Node) && !fab.contains(event.target as Node)) {
        this.isSidebarOpen.set(false);
      }
    }
  }

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

      if (this.activeHero() === 'a' && this.heroImageA() === url) return;
      if (this.activeHero() === 'b' && this.heroImageB() === url) return;

      if (isPlatformBrowser(this.platformId)) {
        // If the URL is already loaded in the inactive buffer, just switch to it instantly
        if (this.heroImageA() === url) {
          this.activeHero.set('a');
          return;
        }
        if (this.heroImageB() === url) {
          this.activeHero.set('b');
          return;
        }

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
      favoriteId: item.id,
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
    const items = this.filteredItems();
    if (items.length === 0) return this.heroImage;

    const heroMovie = items[0];
    const url = heroMovie.backdropUrl || heroMovie.posterUrl;
    return url ? url.replace('w=500', 'w=1920') : this.heroImage;
  });

  // Computed state for filtered and sorted items
  filteredItems = computed(() => {
    let items = this.favoriteItems();

    // 0. Collection Filter
    const activeColId = this.activeCollectionId();
    if (activeColId !== null) {
      const col = this.favoritesService.collections().find(c => c.id === activeColId);
      if (col) {
        items = items.filter(item => col.items.includes((item as any).favoriteId));
      } else {
        items = [];
      }
    } else {
      // General list: hide items the user has explicitly unchecked from "Tutti i preferiti"
      items = items.filter(item => {
        const mediaKey = `${item.isSeries ? 'tv' : 'movie'}_${item.id}`;
        return !this.preferencesService.isHiddenFromGeneral(mediaKey);
      });
    }

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

  // Collections Methods
  selectCollection(id: number | null) {
    this.activeCollectionId.set(id);
    this.searchQuery.set('');
    this.preferencesService.setFavoritesHeroMovieId(null); // Reset hero image to last saved item of new collection
  }

  startCreatingCollection() {
    this.isCreatingCollection.set(true);
    this.newCollectionName.set('');
  }

  cancelCreatingCollection() {
    this.isCreatingCollection.set(false);
    this.newCollectionName.set('');
  }

  async saveNewCollection() {
    const name = this.newCollectionName().trim();
    if (!name) return;
    const col = await this.favoritesService.createCollection(name);
    if (col) {
      this.selectCollection(col.id);
    }
    this.isCreatingCollection.set(false);
    this.newCollectionName.set('');
  }

  async deleteCollection(id: number, event: Event) {
    event.stopPropagation();
    if (confirm('Sei sicuro di voler eliminare questa collezione? I preferiti al suo interno non verranno eliminati.')) {
      await this.favoritesService.deleteCollection(id);
      if (this.activeCollectionId() === id) {
        this.selectCollection(null);
      }
    }
  }

}
