import { Injectable, signal, effect, inject, PLATFORM_ID, computed, ApplicationRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';

export interface FavoriteItem {
  id?: string;
  media_id: number;
  media_type: string;
  title: string;
  poster_url: string;
  backdrop_url: string;
  added_at?: string;

  // These fields are mapped dynamically for UI usage if needed
  year?: number;
  duration?: string;
  genres?: string[];
  matchScore?: string;
}

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private appRef = inject(ApplicationRef);
  private apiUrl = environment.apiUrl;

  items = signal<FavoriteItem[]>([]);

  private favoritesSet = computed(() => {
    const set = new Set<string>();
    for (const item of this.items()) {
      set.add(`${item.media_type}_${item.media_id}`);
    }
    return set;
  });

  constructor() {
    effect(() => {
      const profile = this.authService.selectedProfile();
      if (profile && isPlatformBrowser(this.platformId)) {
        this.loadFavorites(profile.id);
      } else {
        this.items.set([]);
      }
    });
  }

  async loadFavorites(profileId: string) {
    try {
      const items = await firstValueFrom(this.http.get<FavoriteItem[]>(`${this.apiUrl}/favorites?profileId=${profileId}`));
      this.items.set(items);
    } catch (err) {
      console.error('Failed to load favorites', err);
      this.items.set([]);
    }
  }

  isBookmarked(mediaId: number, isSeries?: boolean): boolean {
    const type = isSeries ? 'tv' : 'movie';
    return this.favoritesSet().has(`${type}_${mediaId}`);
  }

  async toggleFavorite(movie: any, forceIsSeries?: boolean) {
    const profile = this.authService.selectedProfile();
    if (!profile) return;

    const mediaId = movie.id;
    const isSeries = forceIsSeries !== undefined ? forceIsSeries : !!movie.isSeries;
    const mediaType = isSeries ? 'tv' : 'movie';
    const isBookmarked = this.isBookmarked(mediaId, isSeries);

    try {
      if (isBookmarked) {
        this.items.update(curr => curr.filter(i => !(i.media_id === mediaId && i.media_type === mediaType)));
        this.appRef.tick(); // Force UI update
        await firstValueFrom(this.http.delete(`${this.apiUrl}/favorites/${mediaId}?profileId=${profile.id}&mediaType=${mediaType}`));
      } else {
        const newItem: FavoriteItem = {
          media_id: mediaId,
          media_type: mediaType,
          title: movie.title || movie.name,
          poster_url: movie.posterUrl || movie.poster_path,
          backdrop_url: movie.backdropUrl || movie.backdrop_path || movie.posterUrl
        };

        this.items.update(curr => [newItem, ...curr]);
        this.appRef.tick(); // Force UI update

        const res = await firstValueFrom(this.http.post<FavoriteItem>(`${this.apiUrl}/favorites`, {
          profileId: profile.id,
          mediaId: newItem.media_id,
          mediaType: newItem.media_type,
          title: newItem.title,
          posterUrl: newItem.poster_url,
          backdropUrl: newItem.backdrop_url
        }));

        if (res && res.id) {
          this.items.update(curr => curr.map(i => (i.media_id === mediaId && i.media_type === mediaType) ? res : i));
        }
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      if (profile) this.loadFavorites(profile.id);
    }
  }
}
