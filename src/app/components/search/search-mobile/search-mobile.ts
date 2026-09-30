import { Component, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FavoritesService } from '../../../services/favorites.service';
import { CollectionsModalService } from '../../../services/collections-modal.service';
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
  
  movieClick = output<any>();
  
  favoritesService = inject(FavoritesService);
  collectionsModalService = inject(CollectionsModalService);

  onToggleBookmark(item: any, event: Event) {
    event.stopPropagation();
    const posterUrl = item.posterUrl || item.backdropUrl || '';
    const year = item.year || (item.releaseDate ? item.releaseDate.substring(0, 4) : '');
    this.collectionsModalService.openModal({
      id: item.id,
      title: item.title,
      posterUrl: posterUrl,
      backdropUrl: item.backdropUrl || posterUrl,
      year: year.toString(),
      isSeries: !!item.isSeries
    });
  }
}
