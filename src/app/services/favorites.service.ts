import { Injectable, signal, effect, inject, PLATFORM_ID, computed, ApplicationRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from './notification.service';

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

export interface FavoriteCollection {
  id: number;
  name: string;
  items: string[]; // array of favorite_ids (UUIDs)
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private appRef = inject(ApplicationRef);
  private notificationService = inject(NotificationService);
  private apiUrl = environment.apiUrl;

  items = signal<FavoriteItem[]>([]);
  collections = signal<FavoriteCollection[]>([]);

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
      const [items, collections] = await Promise.all([
        firstValueFrom(this.http.get<FavoriteItem[]>(`${this.apiUrl}/favorites?profileId=${profileId}`)),
        firstValueFrom(this.http.get<FavoriteCollection[]>(`${this.apiUrl}/favorites/collections?profileId=${profileId}`))
      ]);
      this.items.set(items);
      this.collections.set(collections);
    } catch (err) {
      console.error('Failed to load favorites or collections', err);
      this.items.set([]);
      this.collections.set([]);
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
        this.items.update(curr => curr.filter(i => !(Number(i.media_id) === Number(mediaId) && i.media_type === mediaType)));
        this.appRef.tick(); // Force UI update
        await firstValueFrom(this.http.delete(`${this.apiUrl}/favorites/${mediaId}?profileId=${profile.id}&mediaType=${mediaType}`));
      } else {
        const newItem: FavoriteItem = {
          media_id: Number(mediaId),
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
          
          // Ricarica le notifiche dal server per far vedere subito la nuova notifica
          this.notificationService.fetchNotifications(profile.id);
        }
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      if (profile) this.loadFavorites(profile.id);
    }
  }

  // Collections methods
  async createCollection(name: string): Promise<FavoriteCollection | undefined> {
    const profile = this.authService.selectedProfile();
    if (!profile) return undefined;
    try {
      const newColl = await firstValueFrom(this.http.post<FavoriteCollection>(`${this.apiUrl}/favorites/collections`, {
        profileId: profile.id,
        name
      }));
      this.collections.update(curr => [...curr, newColl]);
      return newColl;
    } catch (err) {
      console.error('Error creating collection:', err);
      return undefined;
    }
  }

  async renameCollection(collectionId: number, newName: string) {
    const profile = this.authService.selectedProfile();
    if (!profile) return;
    try {
      await firstValueFrom(this.http.put(`${this.apiUrl}/favorites/collections/${collectionId}`, {
        name: newName
      }));
      this.collections.update(curr => curr.map(c => c.id === collectionId ? { ...c, name: newName } : c));
    } catch (err) {
      console.error('Error renaming collection:', err);
    }
  }

  async deleteCollection(collectionId: number) {
    const profile = this.authService.selectedProfile();
    if (!profile) return;
    try {
      await firstValueFrom(this.http.delete(`${this.apiUrl}/favorites/collections/${collectionId}?profileId=${profile.id}`));
      this.collections.update(curr => curr.filter(c => c.id !== collectionId));
    } catch (err) {
      console.error('Error deleting collection:', err);
    }
  }

  async addItemToCollection(collectionId: number, favoriteId: string) {
    this.collections.update(curr => curr.map(c => 
      c.id === collectionId && !c.items.includes(favoriteId) ? { ...c, items: [...c.items, favoriteId] } : c
    ));
    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/favorites/collections/${collectionId}/items`, { favoriteId }));
    } catch (err) {
      console.error('Error adding to collection:', err);
    }
  }

  async removeItemFromCollection(collectionId: number, favoriteId: string) {
    this.collections.update(curr => curr.map(c => 
      c.id === collectionId ? { ...c, items: c.items.filter(id => id !== favoriteId) } : c
    ));
    try {
      await firstValueFrom(this.http.delete(`${this.apiUrl}/favorites/collections/${collectionId}/items/${favoriteId}`));
    } catch (err) {
      console.error('Error removing from collection:', err);
    }
  }

  isMovieInCollection(mediaId: number | string, collectionId: number, isSeries?: boolean): boolean {
    const type = isSeries ? 'tv' : 'movie';
    const favItem = this.items().find(i => Number(i.media_id) === Number(mediaId) && i.media_type === type);
    if (!favItem || !favItem.id) return false;
    const col = this.collections().find(c => c.id === collectionId);
    return col ? col.items.includes(favItem.id) : false;
  }

  async addMovieToCollection(movie: any, collectionId: number, isSeries?: boolean) {
    const type = isSeries ? 'tv' : 'movie';
    let favItem = this.items().find(i => Number(i.media_id) === Number(movie.id) && i.media_type === type);
    
    if (!favItem) {
      // Se non è nei preferiti generali, aggiungiamolo prima lì
      await this.toggleFavorite(movie, isSeries);
      // Riprova a trovarlo (dopo la reattività)
      favItem = this.items().find(i => Number(i.media_id) === Number(movie.id) && i.media_type === type);
      if (!favItem || !favItem.id) return;
    }

    if (favItem.id) {
      await this.addItemToCollection(collectionId, favItem.id);
    }
  }

  async removeMovieFromCollection(mediaId: number | string, collectionId: number, isSeries?: boolean) {
    const type = isSeries ? 'tv' : 'movie';
    const favItem = this.items().find(i => Number(i.media_id) === Number(mediaId) && i.media_type === type);
    if (favItem && favItem.id) {
      await this.removeItemFromCollection(collectionId, favItem.id);
    }
  }
}
