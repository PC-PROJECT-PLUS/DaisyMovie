import { Component, OnInit, signal, input, PLATFORM_ID, inject, effect } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FavoritesService } from '../../../services/favorites.service';
import { HistoryService } from '../../../services/history.service';
import { CastMember, Review, MovieDetail } from '../movie-detail';

@Component({
  selector: 'app-movie-detail-mobile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './movie-detail-mobile.html',
  styleUrl: './movie-detail-mobile.scss'
})
export class MovieDetailMobile implements OnInit {
  private location = inject(Location);
  favoritesService = inject(FavoritesService);
  private historyService = inject(HistoryService);
  private platformId = inject(PLATFORM_ID);
  
  movie = input<MovieDetail | null>(null);
  activeTheme = signal<'dark' | 'light' | 'dynamic'>('dark');
  pageLoaded = signal<boolean>(false);
  
  resumeProgress = signal<number>(0);
  resumeText = signal<string>('');

  newReviewText = signal<string>('');
  showAllReviews = signal<boolean>(false);

  constructor() {
    effect(() => {
      if (this.movie()) {
        if (typeof window !== 'undefined') {
          setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }), 10);
        }
        
        const m = this.movie();
        if (m && isPlatformBrowser(this.platformId)) {
          const historyItem = this.historyService.getResumeProgress(m.id, false);
          if (historyItem && historyItem.progress_seconds && historyItem.progress_seconds > 0) {
            this.resumeProgress.set(historyItem.progress_seconds);
            this.resumeText.set(`Riprendi da ${this.formatTime(historyItem.progress_seconds)}`);
          } else {
            this.resumeProgress.set(0);
            this.resumeText.set('');
          }
        }
      }
    }, { allowSignalWrites: true });
  }

  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  goBack() {
    this.location.back();
  }

  ngOnInit() {
  }

  toggleBookmark() {
    const current = this.movie();
    if (current) {
      this.favoritesService.toggleFavorite(current);
    }
  }

  toggleReviews() {
    this.showAllReviews.update(v => !v);
  }

  submitReview() {
    const text = this.newReviewText().trim();
    if (!text) return;
    
    const current = this.movie();
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
