import { Component, OnInit, signal, input, PLATFORM_ID, inject, effect } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FavoritesService } from '../../../services/favorites.service';
import { CastMember, Review, SeriesDetail } from '../series-detail';

@Component({
  selector: 'app-series-detail-mobile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './series-detail-mobile.html',
  styleUrl: './series-detail-mobile.scss'
})
export class SeriesDetailMobile implements OnInit {
  private location = inject(Location);
  favoritesService = inject(FavoritesService);
  series = input<SeriesDetail | null>(null);
  activeTheme = signal<'dark' | 'light' | 'dynamic'>('dark');
  pageLoaded = signal<boolean>(false);

  newReviewText = signal<string>('');
  showAllReviews = signal<boolean>(false);
  
  isDropdownOpen = signal<boolean>(false);
  activeSeason = signal<number>(1);

  constructor() {
    effect(() => {
      if (this.series()) {
        if (typeof window !== 'undefined') {
          setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }), 10);
        }
      }
    });
  }

  goBack() {
    this.location.back();
  }

  ngOnInit() {
  }

  toggleBookmark() {
    const s = this.series();
    if (s) {
      this.favoritesService.toggleFavorite(s, true);
    }
  }

  toggleReviews() {
    this.showAllReviews.update(v => !v);
  }

  submitReview() {
    const text = this.newReviewText().trim();
    if (!text) return;
    
    const current = this.series();
    if (current) {
      const newReview: Review = {
        id: Date.now().toString(),
        author: 'Tu (Utente)',
        title: 'La tua recensione',
        content: text,
        likes: 0,
        dislikes: 0,
        date: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
      };
      
      if (!current.reviews) {
        current.reviews = [];
      }
      current.reviews.unshift(newReview);
      this.newReviewText.set('');
    }
  }
}
