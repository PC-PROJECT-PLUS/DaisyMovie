import { Component, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FavoritesService } from '../../../services/favorites.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-search-mobile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './search-mobile.html',
  styleUrl: './search-mobile.scss'
})
export class SearchMobileComponent {
  searchResults = input<any[]>([]);
  query = input<string>('');
  heroImage = input<string>('');
  pageLoaded = input<boolean>(false);
  
  favoritesService = inject(FavoritesService);

  onToggleBookmark(item: any, event: Event) {
    event.stopPropagation();
    this.favoritesService.toggleFavorite(item);
  }
}
