import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  
  onToggleBookmark(item: any, event: Event) {
    event.stopPropagation();
    item.isBookmarked = !item.isBookmarked;
  }
}
