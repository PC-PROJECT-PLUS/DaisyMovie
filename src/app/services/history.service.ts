import { Injectable, signal, effect, inject, PLATFORM_ID, computed, ApplicationRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';

export interface HistoryItem {
  id?: string;
  media_id: number;
  media_type: string;
  title: string;
  poster_url: string;
  backdrop_url: string;
  season?: number;
  episode?: number;
  watched_at?: string;
  progress_seconds?: number;
  total_seconds?: number;
  accent_color?: string;

  // These fields are mapped dynamically for UI usage if needed
  year?: number;
  duration?: string;
  genres?: string[];
  matchScore?: string;
}

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private appRef = inject(ApplicationRef);
  private apiUrl = environment.apiUrl;

  items = signal<HistoryItem[]>([]);

  constructor() {
    effect(() => {
      const profile = this.authService.selectedProfile();
      if (profile && isPlatformBrowser(this.platformId)) {
        this.loadHistory(profile.id);
      } else {
        this.items.set([]);
      }
    });
  }

  async loadHistory(profileId: string) {
    try {
      const items = await firstValueFrom(this.http.get<HistoryItem[]>(`${this.apiUrl}/history?profileId=${profileId}`));
      this.items.set(items);
    } catch (err) {
      console.error('Failed to load history', err);
      this.items.set([]);
    }
  }

  async addToHistory(movie: any, progressSeconds: number = 0, forceIsSeries?: boolean, season?: number, episode?: number, totalSeconds: number = 0, accentColor: string = '') {
    const profile = this.authService.selectedProfile();
    if (!profile) return;

    const mediaId = movie.id;
    const isSeries = forceIsSeries !== undefined ? forceIsSeries : !!movie.isSeries;
    const mediaType = isSeries ? 'tv' : 'movie';

    try {
      const newItem: HistoryItem = {
        media_id: mediaId,
        media_type: mediaType,
        title: movie.title || movie.name,
        poster_url: movie.posterUrl || movie.poster_path,
        backdrop_url: movie.backdropUrl || movie.backdrop_path || movie.posterUrl,
        progress_seconds: progressSeconds,
        total_seconds: totalSeconds,
        accent_color: accentColor,
        season: season,
        episode: episode,
        watched_at: new Date().toISOString()
      };

      // Optimistic update UI (remove if already exists, then add to top)
      this.items.update(curr => {
        const filtered = curr.filter(i => !(i.media_id === mediaId && i.media_type === mediaType));
        return [newItem, ...filtered];
      });
      this.appRef.tick();

      const res = await firstValueFrom(this.http.post<HistoryItem>(`${this.apiUrl}/history`, {
        profileId: profile.id,
        mediaId: newItem.media_id,
        mediaType: newItem.media_type,
        title: newItem.title,
        posterUrl: newItem.poster_url,
        backdropUrl: newItem.backdrop_url,
        progressSeconds: newItem.progress_seconds,
        season: newItem.season,
        episode: newItem.episode,
        totalSeconds: newItem.total_seconds,
        accentColor: newItem.accent_color
      }));

      if (res && res.id) {
        this.items.update(curr => curr.map(i => (i.media_id === mediaId && i.media_type === mediaType) ? res : i));
      }
    } catch (err) {
      console.error('Error adding to history:', err);
      if (profile) this.loadHistory(profile.id); // reload on error
    }
  }

  getResumeProgress(mediaId: number, isSeries: boolean): HistoryItem | undefined {
    const type = isSeries ? 'tv' : 'movie';
    return this.items().find(i => i.media_id === mediaId && i.media_type === type);
  }

  async removeFromHistory(mediaId: number, isSeries: boolean) {
    const profile = this.authService.selectedProfile();
    if (!profile) return;
    const mediaType = isSeries ? 'tv' : 'movie';
    
    // Optimistic UI update
    this.items.update(curr => curr.filter(i => !(i.media_id === mediaId && i.media_type === mediaType)));
    
    try {
      await firstValueFrom(this.http.delete(`${this.apiUrl}/history/${mediaId}?profileId=${profile.id}&mediaType=${mediaType}`));
    } catch (err) {
      console.error('Failed to remove from history', err);
      this.loadHistory(profile.id);
    }
  }
}
