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
import { HistoryViewItem } from '../history';

@Component({
  selector: 'app-history-mobile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './history-mobile.html',
  styleUrl: './history-mobile.scss'
})
export class HistoryMobile implements OnInit {
  platformId = inject(PLATFORM_ID);
  historyItems = input<HistoryViewItem[]>([]);
  onRemove = output<HistoryViewItem>();
  themeService = inject(ThemeService);
  favoritesService = inject(FavoritesService);
  router = inject(Router);
  preferencesService = inject(PreferencesService);
  pageLoaded = signal(false);

  // Search and Sort State
  sortOption = signal<'az' | 'recent' | 'match'>('recent');
  isSortDropdownOpen = signal<boolean>(false);
  searchQuery = signal<string>('');
  isSearchFocused = signal<boolean>(false);

  heroImage = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1920px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg';
  heroTitle = 'La tua Cronologia';

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

  currentHeroImage = computed(() => {
    const items = this.historyItems();
    if (items.length === 0) return this.heroImage;

    const heroMovie = items[0];

    const url = heroMovie.backdropUrl || heroMovie.posterUrl;
    return url ? url.replace('w=500', 'w=1920') : this.heroImage;
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
        return 0;
      }
    });

    return items;
  });

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.pageLoaded.set(true);
      }, 50);
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
      'az': 'Titolo (A-Z)',
      'recent': 'Più recenti',
      'match': 'Miglior Match'
    };
    return map[this.sortOption()];
  }

  // Live check — reads from FavoritesService signal every time Angular re-renders
  isMovieBookmarked(id: number, isSeries?: boolean): boolean {
    return this.favoritesService.isBookmarked(id, isSeries);
  }
}
