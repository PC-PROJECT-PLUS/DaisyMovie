import { Component, OnInit, signal, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarMobile } from '../../navbar/navbar-mobile/navbar-mobile';
import { ThemeService } from '../../../services/theme.service';

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
}

@Component({
  selector: 'app-favorites-mobile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './favorites-mobile.html',
  styleUrl: './favorites-mobile.scss'
})
export class FavoritesMobile implements OnInit {
  favoriteItems = input<FavoriteItem[]>([]);
  onRemove = output<FavoriteItem>();
  themeService = inject(ThemeService);
  router = inject(Router);
  pageLoaded = signal(false);

  // Search and Sort State
  searchQuery = signal('');
  sortOption = signal<'az' | 'recent' | 'match'>('recent');
  isSortDropdownOpen = signal(false);
  isSearchFocused = signal(false);

  // Hero Image Data
  heroImage = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1920px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg'; 
  heroTitle = 'I tuoi Preferiti';

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
}
