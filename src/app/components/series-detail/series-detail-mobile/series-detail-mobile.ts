import { Component, OnInit, signal, input, PLATFORM_ID, inject, effect, untracked, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule, Location, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FavoritesService } from '../../../services/favorites.service';
import { HistoryService } from '../../../services/history.service';
import { TmdbService } from '../../../services/tmdb.service';
import { CastMember, Review, SeriesDetail } from '../series-detail';

import { CollectionsModalService } from '../../../services/collections-modal.service';

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
  collectionsModalService = inject(CollectionsModalService);
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
  @Output() episodeClick = new EventEmitter<number>();

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

  episodesAnimState = signal<'out' | 'in' | 'idle'>('idle');

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

    // Animate in when activeEpisodes changes (after parent swaps data at t=260ms)
    effect(() => {
      const eps = this.activeEpisodes();
      if (eps && eps.length >= 0 && isPlatformBrowser(this.platformId)) {
        untracked(() => {
          this.episodesAnimState.set('in');
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              this.episodesAnimState.set('idle');
            });
          });
        });
      }
    });
  }

  goBack() {
    this.location.back();
  }

  onSeasonClick(s: number) {
    this.activeSeason.set(s);
    this.isDropdownOpen.set(false);
    // Trigger fade-out immediately, parent will load new episodes
    this.episodesAnimState.set('out');
    this.seasonChange.emit(s);
    // Reset scroll position of episodes slider
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        const slider = document.getElementById('episodes-slider-mobile');
        if (slider) slider.scrollLeft = 0;
      }, 50);
    }
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
      this.collectionsModalService.openModal({
        id: s.id,
        title: s.title,
        posterUrl: s.posterUrl,
        backdropUrl: s.backdropUrl || s.posterUrl,
        year: (s.year || '').toString(),
        isSeries: true
      });
    }
  }

  toggleBookmarkSuggested(item: any, event: Event) {
    event.stopPropagation();
    const posterUrl = item.posterUrl || item.backdropUrl || '';
    const year = item.year || (item.releaseDate ? item.releaseDate.substring(0, 4) : '');
    this.collectionsModalService.openModal({
      id: item.id,
      title: item.title || item.name,
      posterUrl: posterUrl,
      backdropUrl: item.backdropUrl || posterUrl,
      year: year.toString(),
      isSeries: !!item.isSeries
    });
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
