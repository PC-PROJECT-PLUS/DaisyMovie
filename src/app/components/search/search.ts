import { Component, OnInit, signal, computed, inject, PLATFORM_ID, effect, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { TmdbService } from '../../services/tmdb.service';
import { FavoritesService } from '../../services/favorites.service';
import { LoaderService } from '../../services/loader.service';
import { SearchMobileComponent } from './search-mobile/search-mobile';

interface MovieItem {
  id: number;
  title: string;
  year: number;
  duration: string;
  matchScore: string;
  genres: string[];
  synopsis: string;
  posterUrl: string;
  backdropUrl?: string;
  accentColor: string;
  isBookmarked?: boolean;
  isSeries?: boolean;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SearchMobileComponent],
  templateUrl: './search.html',
  styleUrl: './search.scss'
})
export class SearchComponent implements OnInit {
  platformId = inject(PLATFORM_ID);
  themeService = inject(ThemeService);
  tmdbService = inject(TmdbService);
  favoritesService = inject(FavoritesService);
  loaderService = inject(LoaderService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  titleService = inject(Title);

  isMobile = signal(false);
  pageLoaded = signal(false);

  searchQuery = signal('');
  hoveredItemId = signal<number | null>(null);

  heroTitle = signal('Ricerca');

  heroImage = computed(() => {
    const items = this.filteredItems();
    if (items.length > 0) {
      return items[0].backdropUrl || items[0].posterUrl;
    }
    return '';
  });

  filteredItems = signal<any[]>([]);
  currentPage = signal(1);
  hasMore = signal(true);
  isLoading = signal(false);

  constructor() {
    effect(() => {
      const title = this.searchQuery() ? `Risultati per "${this.searchQuery()}"` : 'Cerca';
      this.heroTitle.set(title);
      this.titleService.setTitle(title);
    });

    effect(() => {
      if (!this.loaderService.isPageLoading()) {
        setTimeout(() => this.pageLoaded.set(true), 50);
      } else {
        this.pageLoaded.set(false);
      }
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['q']) {
        const q = params['q'].trim();
        if (q !== this.searchQuery()) {
          this.searchQuery.set(q);
          this.performSearch(true);
        } else {
          this.loaderService.setRouteReady();
        }
      } else {
        this.searchQuery.set('');
        this.filteredItems.set([]);
        this.loaderService.setRouteReady();
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      this.checkScreenSize();
      window.addEventListener('resize', this.checkScreenSize.bind(this));
    }
  }

  checkScreenSize() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile.set(window.innerWidth <= 768);
    }
  }

  goToDetail(movie: any) {
    this.loaderService.startNavigation();
    
    const movieDetail: any = {
      id: movie.id,
      title: movie.title,
      backdropUrl: movie.backdropUrl,
      posterUrl: movie.posterUrl,
      year: movie.year,
      duration: movie.duration,
      genres: movie.genres,
      matchScore: movie.matchScore || '95% Match',
      synopsis: movie.overview || movie.synopsis || 'Nessuna sinossi disponibile.',
      isSeries: movie.isSeries,
      ratingPercent: movie.ratingPercent || 0,
      watchCount: movie.watchCount || '0',
      isBookmarked: movie.isBookmarked || false,
      screenshots: [
        'https://via.placeholder.com/1280x720?text=Screenshot+1',
        'https://via.placeholder.com/1280x720?text=Screenshot+2',
        'https://via.placeholder.com/1280x720?text=Screenshot+3',
        'https://via.placeholder.com/1280x720?text=Screenshot+4',
        'https://via.placeholder.com/1280x720?text=Screenshot+5'
      ]
    };

    // Delay the navigation slightly so the loader has time to fade in
    // This hides the background image loading process since search doesn't cache backdrops
    setTimeout(() => {
      if (movie.isSeries) {
        this.router.navigate(['/series', movie.id], { state: { data: movieDetail } });
      } else {
        this.router.navigate(['/movie', movie.id], { state: { data: movieDetail } });
      }
    }, 150);
  }

  toggleBookmark(movie: MovieItem, event: Event) {
    event.stopPropagation();
    this.favoritesService.toggleFavorite(movie);
  }

  performSearch(reset: boolean = false) {
    const q = this.searchQuery();
    if (!q) return;

    if (reset) {
      this.currentPage.set(1);
      this.hasMore.set(true);
      this.filteredItems.set([]);
    }

    if (this.isLoading() || !this.hasMore()) return;

    this.isLoading.set(true);
    this.tmdbService.search(q, this.currentPage()).subscribe({
      next: (results: any[]) => {
        // Discard old results if query has changed
        if (q !== this.searchQuery()) {
          this.isLoading.set(false);
          return;
        }

        if (results.length === 0) {
          this.hasMore.set(false);
        } else {
          this.filteredItems.update(prev => {
            // Deduplicate by ID
            const existingIds = new Set(prev.map(item => item.id));
            const newItems = results.filter(item => !existingIds.has(item.id));
            return [...prev, ...newItems];
          });
          const current = this.currentPage();
          this.currentPage.update(p => p + 1);

          // Automatically fetch the second page if we just loaded the first page
          // This ensures the grid is full on the first render
          if (current === 1) {
            setTimeout(() => this.performSearch(), 50);
          }
        }
        this.isLoading.set(false);
        this.loaderService.setRouteReady();
      },
      error: () => {
        this.isLoading.set(false);
        this.hasMore.set(false);
        this.loaderService.setRouteReady();
      }
    });
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    if (this.isLoading() || !this.hasMore() || !isPlatformBrowser(this.platformId)) return;

    // Add a threshold of 1200px before the bottom to load early
    const threshold = 1200;
    const position = window.innerHeight + window.scrollY;
    const height = document.body.offsetHeight;

    if (position >= height - threshold) {
      this.performSearch();
    }
  }
}
