import { Component, OnInit, signal, computed, inject, input, output, effect, viewChild, ElementRef } from '@angular/core';
import autoAnimate from '@formkit/auto-animate';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarMobile } from '../../navbar/navbar-mobile/navbar-mobile';
import { ThemeService } from '../../../services/theme.service';
import { PreferencesService } from '../../../services/preferences.service';
import { FavoritesService } from '../../../services/favorites.service';

interface FavoriteItem {
  id: number;
  favoriteId?: string;
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
  selector: 'app-favorites-mobile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './favorites-mobile.html',
  styleUrl: './favorites-mobile.scss'
})
export class FavoritesMobile implements OnInit {
  platformId = inject(PLATFORM_ID);
  favoriteItems = input<FavoriteItem[]>([]);
  onRemove = output<FavoriteItem>();
  themeService = inject(ThemeService);
  router = inject(Router);
  preferencesService = inject(PreferencesService);
  pageLoaded = signal(false);

  // Search and Sort State
  sortOption = signal<'az' | 'recent' | 'match'>('recent');
  isSortDropdownOpen = signal<boolean>(false);
  searchQuery = signal<string>('');
  isSearchFocused = signal<boolean>(false);

  favoritesService = inject(FavoritesService);
  activeCollectionId = signal<number | null>(null);

  isSidebarOpen = signal<boolean>(false);

  heroImage = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1920px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg';
  heroTitle = 'I tuoi Preferiti';

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

    // 1. Collection Filter
    const activeColId = this.activeCollectionId();
    if (activeColId !== null) {
      const col = this.favoritesService.collections().find(c => c.id === activeColId);
      if (col) {
        items = items.filter(item => col.items.includes((item as any).favoriteId));
      } else {
        items = [];
      }
    } else {
      // General list: only show items that are NOT in any custom collection
      const customCols = this.favoritesService.collections();
      items = items.filter(item => {
        return !customCols.some(c => c.items.includes((item as any).favoriteId));
      });
    }

    // 2. Search Filter
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
        return b.year - a.year;
      }
    });

    return items;
  });

  ngOnInit() {
    setTimeout(() => {
      this.pageLoaded.set(true);
    }, 50);
  }

  goToDetail(item: FavoriteItem) {
    if (item.isSeries) {
      this.router.navigate(['/series', item.id]);
    } else {
      this.router.navigate(['/movie', item.id]);
    }
  }

  removeFavorite(item: FavoriteItem, event: Event) {
    event.stopPropagation();
    this.onRemove.emit(item);
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
      'az': 'A-Z',
      'recent': 'Recenti',
      'match': 'Match'
    };
    return map[this.sortOption()];
  }

  selectCollection(id: number | null) {
    this.activeCollectionId.set(id);
    this.searchQuery.set('');
  }

  selectCollectionAndClose(id: number | null) {
    this.selectCollection(id);
    this.isSidebarOpen.set(false);
  }

  toggleSidebar() {
    this.isSidebarOpen.update(val => !val);
  }

  // ── Collection CRUD ──────────────────────────────────────────────
  isCreatingCollection = signal<boolean>(false);
  newCollectionName = signal<string>('');
  collectionToDelete = signal<any | null>(null);
  collectionToEdit = signal<any | null>(null);
  editCollectionName = signal<string>('');
  isClosingModal = signal<boolean>(false);

  closeModalWithAnimation(callback: () => void) {
    this.isClosingModal.set(true);
    setTimeout(() => {
      callback();
      this.isClosingModal.set(false);
    }, 300);
  }

  startCreatingCollection() {
    this.isSidebarOpen.set(false);
    this.isCreatingCollection.set(true);
    this.newCollectionName.set('');
  }

  cancelCreatingCollection() {
    this.closeModalWithAnimation(() => {
      this.isCreatingCollection.set(false);
      this.newCollectionName.set('');
    });
  }

  async saveNewCollection() {
    const name = this.newCollectionName().trim();
    if (!name) return;
    this.closeModalWithAnimation(async () => {
      const col = await this.favoritesService.createCollection(name);
      if (col) { this.selectCollection(col.id); }
      this.isCreatingCollection.set(false);
      this.newCollectionName.set('');
    });
  }

  startEditCollection(col: any, event: Event) {
    event.stopPropagation();
    this.collectionToEdit.set(col);
    this.editCollectionName.set(col.name);
  }

  cancelEditCollection() {
    this.closeModalWithAnimation(() => {
      this.collectionToEdit.set(null);
      this.editCollectionName.set('');
    });
  }

  async saveEditCollection() {
    const col = this.collectionToEdit();
    const name = this.editCollectionName().trim();
    if (col && name && name !== col.name) {
      this.closeModalWithAnimation(async () => {
        await this.favoritesService.renameCollection(col.id, name);
        this.collectionToEdit.set(null);
        this.editCollectionName.set('');
      });
    } else {
      this.cancelEditCollection();
    }
  }

  startDeleteCollection(col: any, event: Event) {
    event.stopPropagation();
    this.collectionToDelete.set(col);
  }

  cancelDeleteCollection() {
    this.closeModalWithAnimation(() => {
      this.collectionToDelete.set(null);
    });
  }

  async confirmDeleteCollection() {
    const col = this.collectionToDelete();
    if (col) {
      this.closeModalWithAnimation(async () => {
        await this.favoritesService.deleteCollection(col.id);
        if (this.activeCollectionId() === col.id) { this.selectCollection(null); }
        this.collectionToDelete.set(null);
      });
    }
  }

  get activeCollectionName(): string {
    const id = this.activeCollectionId();
    if (id === null) return 'I tuoi Preferiti';
    const col = this.favoritesService.collections().find(c => c.id === id);
    return col ? col.name : 'I tuoi Preferiti';
  }
}

