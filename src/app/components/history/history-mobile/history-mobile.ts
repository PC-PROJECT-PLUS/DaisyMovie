import { Component, OnInit, signal, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../services/theme.service';
import { PreferencesService } from '../../../services/preferences.service';

interface HistoryItem {
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
  selector: 'app-history-mobile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './history-mobile.html',
  styleUrl: './history-mobile.scss'
})
export class HistoryMobile implements OnInit {
  historyItems = input<HistoryItem[]>([]);
  onBookmarkToggle = output<HistoryItem>();
  themeService = inject(ThemeService);
  preferencesService = inject(PreferencesService);
  router = inject(Router);
  pageLoaded = signal(false);

  // Search and Sort State
  searchQuery = signal('');
  sortOption = signal<'az' | 'recent' | 'match'>('recent');
  isSortDropdownOpen = signal(false);
  isSearchFocused = signal(false);

    heroItem = computed(() => {
    const id = this.preferencesService.historyHeroMovieId();
    if (id) {
      const item = this.historyItems().find(i => i.id === id);
      if (item) return item;
    }
    return this.historyItems().length > 0 ? this.historyItems()[0] : null;
  });

  heroImage = computed(() => this.heroItem()?.backdropUrl || this.heroItem()?.posterUrl || 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Great_Wave_off_Kanagawa2.jpg/1920px-Great_Wave_off_Kanagawa2.jpg');
  heroTitle = 'Cronologia';

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

  goToDetail(item: HistoryItem) {
    if (item.isSeries) {
      this.router.navigate(['/series', item.id]);
    } else {
      this.router.navigate(['/movie', item.id]);
    }
  }

  toggleBookmark(item: HistoryItem, event: Event) {
    event.stopPropagation();
    this.onBookmarkToggle.emit(item);
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




