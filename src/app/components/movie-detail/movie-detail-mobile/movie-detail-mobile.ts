import { Component, OnInit, signal, input, PLATFORM_ID, inject, effect, untracked, Output, EventEmitter } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FavoritesService } from '../../../services/favorites.service';
import { HistoryService } from '../../../services/history.service';
import { TmdbService } from '../../../services/tmdb.service';
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
  private tmdbService = inject(TmdbService);
  private platformId = inject(PLATFORM_ID);

  movie = input<MovieDetail | null>(null);
  activeTheme = signal<'dark' | 'light' | 'dynamic'>('dark');
  pageLoaded = signal<boolean>(false);

  @Output() play = new EventEmitter<void>();
  @Output() playTrailer = new EventEmitter<void>();
  @Output() goToMovie = new EventEmitter<any>();

  resumeProgress = signal<number>(0);
  resumeText = signal<string>('');

  newReviewText = signal<string>('');
  showAllReviews = signal<boolean>(false);

  infiniteSuggested = signal<any[]>([]);
  suggestedPage = signal<number>(1);
  isLoadingMore = signal<boolean>(false);
  hasMoreSuggested = signal<boolean>(true);

  constructor() {
    effect(() => {
      const m = this.movie();
      if (m) {
        untracked(() => {
          this.infiniteSuggested.set([...(m.suggested || [])]);
          this.suggestedPage.set(1);
          this.isLoadingMore.set(false);
          this.hasMoreSuggested.set(true);
        });
        if (isPlatformBrowser(this.platformId)) {
          const historyItem = this.historyService.getResumeProgress(m.id, false);
          untracked(() => {
            if (historyItem && historyItem.progress_seconds && historyItem.progress_seconds > 0) {
              this.resumeProgress.set(historyItem.progress_seconds);
              this.resumeText.set(`Riprendi da ${this.formatTime(historyItem.progress_seconds)}`);
            } else {
              this.resumeProgress.set(0);
              this.resumeText.set('');
            }
          });
        }
      }
    });
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

  toggleBookmarkSuggested(item: any, event: Event) {
    event.stopPropagation();
    this.favoritesService.toggleFavorite(item, item.isSeries);
  }

  onSliderScroll(event: Event) {
    const el = event.target as HTMLElement;
    if (el.scrollLeft + el.clientWidth > el.scrollWidth - 300) {
      if (!this.isLoadingMore() && this.movie() && this.hasMoreSuggested()) {
        this.isLoadingMore.set(true);
        const nextPage = this.suggestedPage() + 1;
        this.tmdbService.getRecommendations('movie', this.movie()!.id, nextPage).subscribe({
          next: (moreSuggested) => {
            if (moreSuggested && moreSuggested.length > 0) {
              const current = this.infiniteSuggested();
              
              // Filter out duplicates
              const currentIds = new Set(current.map(item => item.id));
              const uniqueNew = moreSuggested.filter(item => !currentIds.has(item.id));
              
              if (uniqueNew.length > 0) {
                this.infiniteSuggested.set([...current, ...uniqueNew]);
              } else {
                // If TMDB returns only duplicates (common edge case), fallback to stop loading
                this.hasMoreSuggested.set(false);
              }
              
              this.suggestedPage.set(nextPage);
            } else {
              this.hasMoreSuggested.set(false);
            }
            this.isLoadingMore.set(false);
          },
          error: () => {
            this.isLoadingMore.set(false);
          }
        });
      }
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

  toRgba(hex: string, alpha: number): string {
    let c: any;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('');
      if (c.length == 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = '0x' + c.join('');
      return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
    }
    return `rgba(20,20,20,${alpha})`;
  }
}
