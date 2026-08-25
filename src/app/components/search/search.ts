import { Component, OnInit, signal, computed, inject, PLATFORM_ID, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
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

  // Mock Database
  mockDatabase: MovieItem[] = [
    { id: 401, title: 'Your Name', year: 2016, matchScore: '99% Match', genres: ['Anime', 'Romance'], synopsis: 'Due sconosciuti scoprono di essere legati in un modo bizzarro.', posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80', backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80', accentColor: '#3b82f6', duration: '1h 52m' },
    { id: 701, title: 'Stranger Things', year: 2016, matchScore: '99% Match', genres: ['Sci-Fi', 'Thriller'], synopsis: 'Quando un ragazzino scompare, i suoi amici e la famiglia si trovano a scoprire forze occulte.', posterUrl: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8b2AOjG09.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w1280/56v2KjBlU4aT8U23zRhlgY0jWGV.jpg', accentColor: '#ef4444', duration: '4 Seasons', isSeries: true },
    { id: 702, title: 'Oppenheimer', year: 2023, matchScore: '98% Match', genres: ['Biography', 'Drama'], synopsis: 'La storia del fisico J. Robert Oppenheimer e la creazione della bomba atomica.', posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg', accentColor: '#f59e0b', duration: '3h 0m' },
    { id: 612, title: 'Severance', year: 2022, matchScore: '96% Match', genres: ['Sci-Fi', 'Thriller'], synopsis: 'Mark guida un team i cui ricordi sono stati divisi chirurgicamente.', accentColor: '#3b82f6', posterUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&q=80', backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80', duration: '1 Season', isSeries: true },
    { id: 404, title: 'Akira', year: 1988, matchScore: '95% Match', genres: ['Anime', 'Sci-Fi'], synopsis: 'Un progetto militare segreto mette in pericolo Neo-Tokyo.', posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', accentColor: '#ef4444', duration: '2h 4m' },
    { id: 101, title: 'Interstellar', year: 2014, matchScore: '97% Match', genres: ['Sci-Fi', 'Adventure'], synopsis: 'Un gruppo di esploratori viaggia attraverso un wormhole nello spazio.', posterUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=500&q=80', accentColor: '#3b82f6', duration: '2h 49m' },
    { id: 102, title: 'The Matrix', year: 1999, matchScore: '98% Match', genres: ['Sci-Fi', 'Action'], synopsis: 'Un hacker scopre la vera natura della sua realta.', posterUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&q=80', accentColor: '#10b981', duration: '2h 16m' },
    { id: 105, title: 'Parasite', year: 2019, matchScore: '99% Match', genres: ['Thriller', 'Drama'], synopsis: 'La famiglia Kim si insinua nella vita della ricca famiglia Park.', posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&q=80', accentColor: '#10b981', duration: '2h 12m' },
    { id: 109, title: 'The Dark Knight', year: 2008, matchScore: '98% Match', genres: ['Action', 'Crime'], synopsis: 'Quando la minaccia nota come il Joker emerge, Batman deve accettare una grande sfida.', posterUrl: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=500&q=80', accentColor: '#111827', duration: '2h 32m' },
    { id: 112, title: 'Pulp Fiction', year: 1994, matchScore: '95% Match', genres: ['Crime', 'Drama'], synopsis: 'Le vite di due sicari, un pugile e una coppia di rapinatori si intrecciano.', posterUrl: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=500&q=80', accentColor: '#f59e0b', duration: '2h 34m' }
  ];

  filteredItems = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return [];
    
    const results = this.mockDatabase.filter(item => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchGenre = item.genres.some(g => g.toLowerCase().includes(q));
      return matchTitle || matchGenre;
    });

    return results.sort((a, b) => {
      const aExact = a.title.toLowerCase() === q ? 1 : 0;
      const bExact = b.title.toLowerCase() === q ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      
      const aStart = a.title.toLowerCase().startsWith(q) ? 1 : 0;
      const bStart = b.title.toLowerCase().startsWith(q) ? 1 : 0;
      if (aStart !== bStart) return bStart - aStart;

      return 0;
    });
  });

  constructor() {
    effect(() => {
      const title = this.searchQuery() ? `Risultati per "${this.searchQuery()}"` : 'Cerca';
      this.heroTitle.set(title);
      this.titleService.setTitle(title);
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['q']) {
        this.searchQuery.set(params['q']);
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      this.checkScreenSize();
      window.addEventListener('resize', this.checkScreenSize.bind(this));

      // Entrance animation
      setTimeout(() => {
        this.pageLoaded.set(true);
      }, 150);
    }
  }

  checkScreenSize() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile.set(window.innerWidth <= 768);
    }
  }

  goToDetail(movie: MovieItem) {
    if (movie.isSeries) {
      this.router.navigate(['/series', movie.id]);
    } else {
      this.router.navigate(['/movie', movie.id]);
    }
  }

  toggleBookmark(movie: MovieItem, event: Event) {
    event.stopPropagation();
    movie.isBookmarked = !movie.isBookmarked;
  }
}
