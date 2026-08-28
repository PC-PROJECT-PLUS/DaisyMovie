import { Component, OnInit, OnDestroy, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../navbar/navbar';
import { ThemeService } from '../../services/theme.service';
import { PreferencesService } from '../../services/preferences.service';
import { FavoritesMobile } from './favorites-mobile/favorites-mobile';

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

export const FAVORITE_ITEMS: FavoriteItem[] = [
  { id: 401, title: 'Your Name', year: 2016, matchScore: '99% Match', genres: ['Anime', 'Romance'], synopsis: 'Due sconosciuti scoprono di essere legati in un modo bizzarro.', posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80', accentColor: '#3b82f6', duration: '1h 52m', isSeries: false },
  { id: 601, title: 'Breaking Bad', year: 2008, matchScore: '99% Match', genres: ['Crime', 'Drama'], synopsis: 'Un professore di chimica del liceo con cancro terminale inizia a produrre metanfetamine.', posterUrl: 'https://images.unsplash.com/photo-1532187863486-abf9db0c2850?w=500&q=80', accentColor: '#10b981', duration: '5 Seasons', isSeries: true },
  { id: 604, title: 'Game of Thrones', year: 2011, matchScore: '98% Match', genres: ['Fantasy', 'Drama'], synopsis: 'Nove nobili famiglie lottano per il controllo di Westeros...', posterUrl: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg', accentColor: '#3b82f6', duration: '8 Seasons', isSeries: true },
  { id: 612, title: 'Severance', year: 2022, matchScore: '96% Match', genres: ['Sci-Fi', 'Thriller'], synopsis: 'Mark guida un team i cui ricordi sono stati divisi chirurgicamente tra lavoro e vita privata.', accentColor: '#3b82f6', posterUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&q=80', duration: '1 Season', isSeries: true },
  { id: 404, title: 'Akira', year: 1988, matchScore: '95% Match', genres: ['Anime', 'Sci-Fi'], synopsis: 'Un progetto militare segreto mette in pericolo Neo-Tokyo.', posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80', accentColor: '#ef4444', duration: '2h 4m', isSeries: false },
  { id: 608, title: 'Succession', year: 2018, matchScore: '94% Match', genres: ['Drama'], synopsis: 'La famiglia Roy controlla la pi grande azienda di media e intrattenimento del mondo...', posterUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&q=80', accentColor: '#d4af37', duration: '4 Seasons', isSeries: true },
  { id: 101, title: 'Interstellar', year: 2014, matchScore: '97% Match', genres: ['Sci-Fi', 'Adventure'], synopsis: 'Un gruppo di esploratori viaggia attraverso un wormhole nello spazio.', posterUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=500&q=80', accentColor: '#3b82f6', duration: '2h 49m', isSeries: false },
  { id: 102, title: 'The Matrix', year: 1999, matchScore: '98% Match', genres: ['Sci-Fi', 'Action'], synopsis: 'Un hacker scopre la vera natura della sua realt.', posterUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&q=80', accentColor: '#10b981', duration: '2h 16m', isSeries: false },
  { id: 103, title: 'Stranger Things', year: 2016, matchScore: '95% Match', genres: ['Horror', 'Sci-Fi'], synopsis: 'La scomparsa di un ragazzino svela misteriosi esperimenti segreti.', posterUrl: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?w=500&q=80', accentColor: '#ef4444', duration: '4 Seasons', isSeries: true },
  { id: 104, title: 'Inception', year: 2010, matchScore: '96% Match', genres: ['Action', 'Sci-Fi'], synopsis: 'Un ladro che ruba segreti aziendali attraverso l\'uso della tecnologia della condivisione dei sogni.', posterUrl: 'https://images.unsplash.com/photo-1614729939124-03290b8ffa58?w=500&q=80', accentColor: '#8b5cf6', duration: '2h 28m', isSeries: false },
  { id: 105, title: 'Parasite', year: 2019, matchScore: '99% Match', genres: ['Thriller', 'Drama'], synopsis: 'La famiglia Kim, povera e disoccupata, si insinua nella vita della ricca famiglia Park.', posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&q=80', accentColor: '#10b981', duration: '2h 12m', isSeries: false },
  { id: 106, title: 'The Office', year: 2005, matchScore: '93% Match', genres: ['Comedy'], synopsis: 'Un mockumentary su un gruppo di impiegati di un\'azienda di carta.', posterUrl: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=500&q=80', accentColor: '#6b7280', duration: '9 Seasons', isSeries: true },
  { id: 107, title: 'Blade Runner 2049', year: 2017, matchScore: '92% Match', genres: ['Sci-Fi', 'Mystery'], synopsis: 'Un nuovo blade runner scopre un segreto a lungo sepolto.', posterUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500&q=80', accentColor: '#f59e0b', duration: '2h 44m', isSeries: false },
  { id: 108, title: 'Spirited Away', year: 2001, matchScore: '99% Match', genres: ['Anime', 'Fantasy'], synopsis: 'Una ragazzina di dieci anni si perde in un mondo governato da di, streghe e spiriti.', posterUrl: 'https://images.unsplash.com/photo-1601850494422-3fb19e130d55?w=500&q=80', accentColor: '#ec4899', duration: '2h 5m', isSeries: false },
  { id: 109, title: 'The Dark Knight', year: 2008, matchScore: '98% Match', genres: ['Action', 'Crime'], synopsis: 'Quando la minaccia nota come il Joker emerge, Batman deve accettare una grande sfida.', posterUrl: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=500&q=80', accentColor: '#111827', duration: '2h 32m', isSeries: false },
  { id: 110, title: 'The Boys', year: 2019, matchScore: '94% Match', genres: ['Action', 'Comedy'], synopsis: 'Un gruppo di vigilanti decide di smascherare i supereroi corrotti.', posterUrl: 'https://images.unsplash.com/photo-1531259683007-016a7b628fc3?w=500&q=80', accentColor: '#ef4444', duration: '3 Seasons', isSeries: true },
  { id: 111, title: 'Chernobyl', year: 2019, matchScore: '97% Match', genres: ['Drama', 'History'], synopsis: 'Nell\'aprile del 1986, una tremenda esplosione devasta la centrale nucleare.', posterUrl: 'https://images.unsplash.com/photo-1535350356005-fd52b3b524fb?w=500&q=80', accentColor: '#10b981', duration: '1 Season', isSeries: true },
  { id: 112, title: 'Pulp Fiction', year: 1994, matchScore: '95% Match', genres: ['Crime', 'Drama'], synopsis: 'Le vite di due sicari, un pugile e una coppia di rapinatori si intrecciano.', posterUrl: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=500&q=80', accentColor: '#f59e0b', duration: '2h 34m', isSeries: false }
];

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
  isMobile = signal(false);
  pageLoaded = signal(false);
  // Search and Sort State
  searchQuery = signal('');
  sortOption = signal<'az' | 'recent' | 'match'>('recent');
  isSortDropdownOpen = signal(false);
  isSearchFocused = signal(false);

  // Hero Image Data
  heroImage = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1920px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg'; // Notte Stellata di Van Gogh
  heroTitle = 'I tuoi Preferiti';

  get currentHeroImage(): string {
    const prefId = this.preferencesService.favoritesHeroMovieId();
    if (prefId) {
      const movie = this.favoriteItems().find(m => m.id === prefId);
      if (movie) {
        const url = movie.backdropUrl || movie.posterUrl;
        return url ? url.replace('w=500', 'w=1920') : url;
      }
    }
    return this.heroImage;
  }

  favoriteItems = signal<FavoriteItem[]>(FAVORITE_ITEMS);

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
        // recent: fallback to default array order or year
        return b.year - a.year;
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

      // Staggered animation trigger
      setTimeout(() => {
        this.pageLoaded.set(true);
      }, 50);
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
    this.favoriteItems.update(items => items.filter(i => i.id !== item.id));
  }

  toggleSortDropdown() {
    this.isSortDropdownOpen.update(val => !val);
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
