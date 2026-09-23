import { Component, OnInit, signal, input, PLATFORM_ID, inject, effect, untracked, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FavoritesService } from '../../../services/favorites.service';
import { HistoryService } from '../../../services/history.service';
import { TmdbService } from '../../../services/tmdb.service';
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
  private historyService = inject(HistoryService);
  private tmdbService = inject(TmdbService);
  private platformId = inject(PLATFORM_ID);
  private elementRef = inject(ElementRef);

  series = input<SeriesDetail | null>(null);
  activeTheme = signal<'dark' | 'light' | 'dynamic'>('dark');
  pageLoaded = signal<boolean>(false);

  @Output() play = new EventEmitter<void>();
  @Output() playTrailer = new EventEmitter<void>();
  @Output() goToMovie = new EventEmitter<any>();
  @Output() seasonChange = new EventEmitter<number>();

  activeEpisodes = input<any[]>([]);
  seasons = input<number[]>([]);

  newReviewText = signal<string>('');
  showAllReviews = signal<boolean>(false);

  isDropdownOpen = signal<boolean>(false);
  activeSeason = signal<number>(1);

  resumeProgress = signal<number>(0);
  resumeText = signal<string>('');
  resumeSeason = signal<number>(1);
  resumeEpisode = signal<number>(1);

  infiniteSuggested = signal<any[]>([]);
  suggestedPage = signal<number>(1);
  isLoadingMore = signal<boolean>(false);
  hasMoreSuggested = signal<boolean>(true);

  constructor() {
    effect(() => {
      const s = this.series();
      if (s) {
        untracked(() => {
          this.infiniteSuggested.set([...(s.suggested || [])]);
          this.suggestedPage.set(1);
          this.isLoadingMore.set(false);
          this.hasMoreSuggested.set(true);
        });
        if (isPlatformBrowser(this.platformId)) {
          const historyItem = this.historyService.getResumeProgress(s.id, true);
          untracked(() => {
            if (historyItem && historyItem.progress_seconds !== undefined && historyItem.progress_seconds >= 0) {
              this.resumeProgress.set(historyItem.progress_seconds);
              this.resumeSeason.set(historyItem.season || 1);
              this.resumeEpisode.set(historyItem.episode || 1);
              this.resumeText.set(`Riprendi S${historyItem.season} E${historyItem.episode}`);
            } else {
              this.resumeProgress.set(0);
              this.resumeText.set('');
              this.resumeSeason.set(1);
              this.resumeEpisode.set(1);
            }
          });
        }
      }
    });
  }

  goBack() {
    this.location.back();
  }

  onSeasonClick(s: number) {
    this.activeSeason.set(s);
    this.isDropdownOpen.set(false);
    this.seasonChange.emit(s);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (this.isDropdownOpen()) {
      const clickedInside = this.elementRef.nativeElement.querySelector('.custom-dropdown-container')?.contains(event.target as Node);
      if (!clickedInside) {
        this.isDropdownOpen.set(false);
      }
    }
  }

  ngOnInit() {
  }

  toggleBookmark() {
    const s = this.series();
    if (s) {
      this.favoritesService.toggleFavorite(s, true);
    }
  }

  toggleBookmarkSuggested(item: any, event: Event) {
    event.stopPropagation();
    this.favoritesService.toggleFavorite(item, item.isSeries);
  }

  onSliderScroll(event: Event) {
    const el = event.target as HTMLElement;
    if (el.scrollLeft + el.clientWidth > el.scrollWidth - 300) {
      if (!this.isLoadingMore() && this.series() && this.hasMoreSuggested()) {
        this.isLoadingMore.set(true);
        const nextPage = this.suggestedPage() + 1;
        this.tmdbService.getRecommendations('tv', this.series()!.id, nextPage).subscribe({
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
