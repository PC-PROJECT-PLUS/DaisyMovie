import { Injectable, signal, PLATFORM_ID, inject, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { firstValueFrom } from 'rxjs';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  icon?: 'play' | 'star' | 'alert' | 'calendar' | 'list';
  targetUrl?: string; // e.g. /movie/123 or /series/456
  mediaId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private platformId = inject(PLATFORM_ID);
  
  notifications = signal<AppNotification[]>([]);
  upcomingNotifiedIds = signal<Set<number>>(new Set<number>());
  emailDigestEnabled = signal<boolean>(true);
  
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = environment.apiUrl;
  
  async fetchNotifications(profileId: string) {
    try {
      const data = await firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/notifications?profileId=${profileId}`));
      this.notifications.set(data);
    } catch (error) {
      console.error('Error fetching notifications from DB:', error);
    }
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadFromStorage();
      
      // Auto-save to localStorage when upcomingNotifiedIds changes
      effect(() => {
        const ids = Array.from(this.upcomingNotifiedIds());
        localStorage.setItem('daisy_upcoming_notified', JSON.stringify(ids));
      });
      
      // Auto-save email preferences
      effect(() => {
        localStorage.setItem('daisy_email_digest', JSON.stringify(this.emailDigestEnabled()));
      });
      
      // Caricamento notifiche dal backend (reagisce al cambio profilo)
      effect(() => {
        const profile = this.authService.selectedProfile();
        if (profile) {
          this.fetchNotifications(profile.id);
        } else {
          this.notifications.set([]);
        }
      });
    }
  }

  private loadFromStorage() {
    try {
      const storedIds = localStorage.getItem('daisy_upcoming_notified');
      if (storedIds) {
        this.upcomingNotifiedIds.set(new Set(JSON.parse(storedIds)));
      }
      
      const storedEmailPrefs = localStorage.getItem('daisy_email_digest');
      if (storedEmailPrefs !== null) {
        this.emailDigestEnabled.set(JSON.parse(storedEmailPrefs));
      }
    } catch (e) {
      console.error('Error loading preferences', e);
    }
  }

  /** Generates dynamic notifications based on favorites/history (mock logic) */
  public generateDynamicNotifications(favorites: any[], history: any[]) {
    // We only generate once if we don't have many unread
    if (!isPlatformBrowser(this.platformId)) return;
    
    let newNotifs: AppNotification[] = [];
    
    // 1. Check favorites for 'New Episodes' or 'News'
    if (favorites && favorites.length > 0) {
      const randomFav = favorites[Math.floor(Math.random() * favorites.length)];
      if (randomFav.media_type === 'tv' || randomFav.isSeries) {
        newNotifs.push({
          id: 'dyn_' + Date.now() + '_1',
          title: 'Nuovo Episodio Disponibile',
          message: `Un nuovo episodio di "${randomFav.title}" è appena uscito!`,
          time: 'Appena ora',
          unread: true,
          icon: 'play',
          targetUrl: `/series/${randomFav.id || randomFav.media_id}`
        });
      } else {
        newNotifs.push({
          id: 'dyn_' + Date.now() + '_2',
          title: 'Novità in arrivo',
          message: `Ci sono novità interessanti per "${randomFav.title}" che hai tra i preferiti.`,
          time: 'Appena ora',
          unread: true,
          icon: 'alert',
          targetUrl: `/movie/${randomFav.id || randomFav.media_id}`
        });
      }
    }

    // 2. Recommendations based on history
    if (history && history.length > 0) {
      const randomHist = history[Math.floor(Math.random() * history.length)];
      newNotifs.push({
        id: 'dyn_' + Date.now() + '_3',
        title: 'Consigliato per te',
        message: `Perché hai guardato "${randomHist.title}", ti consigliamo qualcosa di simile!`,
        time: '1 ora fa',
        unread: true,
        icon: 'star',
        targetUrl: '/' // Should ideally point to a search/category or specific movie
      });
    } else {
      // Random if no history
      newNotifs.push({
        id: 'dyn_' + Date.now() + '_4',
        title: 'Nuova aggiunta al catalogo',
        message: 'Abbiamo appena aggiunto dei nuovi capolavori che potrebbero piacerti.',
        time: '2 ore fa',
        unread: true,
        icon: 'star',
        targetUrl: '/'
      });
    }

    // Merge with existing, avoiding duplicates by title for simplicity
    const current = this.notifications();
    const toAdd = newNotifs.filter(n => !current.find(c => c.title === n.title));
    
    if (toAdd.length > 0) {
      this.notifications.update(curr => [...toAdd, ...curr].slice(0, 15)); // Keep max 15
    }
  }

  public async markAsRead(id: string) {
    const notifs = this.notifications();
    const index = notifs.findIndex(n => n.id === id);
    if (index !== -1 && notifs[index].unread) {
      const newNotifs = [...notifs];
      newNotifs[index].unread = false;
      this.notifications.set(newNotifs);
      
      try {
        await firstValueFrom(this.http.put(`${this.apiUrl}/notifications/${id}/read`, {}));
      } catch (error) {
        console.error('Failed to mark notification as read in DB:', error);
      }
    }
  }

  async markAllAsRead() {
    const profile = this.authService.selectedProfile();
    const newNotifs = this.notifications().map(n => ({ ...n, unread: false }));
    this.notifications.set(newNotifs);
    
    if (profile) {
      try {
        await firstValueFrom(this.http.put(`${this.apiUrl}/notifications/read-all`, { profileId: profile.id }));
      } catch (error) {
        console.error('Failed to mark all as read in DB:', error);
      }
    }
  }

  async createTestNotification(title: string, message: string, mediaId?: number) {
    const profile = this.authService.selectedProfile();
    if (!profile) {
      alert('Nessun profilo selezionato. Torna alla schermata profili per selezionarne uno prima di testare le notifiche.');
      return;
    }
    
    try {
      await firstValueFrom(this.http.post(`${this.apiUrl}/notifications/test`, {
        profileId: profile.id,
        title,
        message,
        mediaId
      }));
      // Ricarica le notifiche per mostrare quella nuova
      await this.fetchNotifications(profile.id);
      alert('Notifica di prova generata con successo! Apri la campanellina in alto a destra per vederla.');
    } catch (error) {
      console.error('Failed to create test notification:', error);
      alert('Errore di connessione al database durante la generazione della notifica.');
    }
  }

  async toggleUpcomingNotification(mediaId: number, mediaType: 'movie' | 'tv' = 'movie', title: string = '', posterUrl: string = '', backdropUrl: string = '') {
    const profile = this.authService.selectedProfile();
    if (!profile) return;

    const isFollowing = this.upcomingNotifiedIds().has(mediaId);

    try {
      if (isFollowing) {
        // Rimuovi dal backend
        await firstValueFrom(this.http.delete(`${this.apiUrl}/following/${mediaId}?profileId=${profile.id}&mediaType=${mediaType}`));
        this.upcomingNotifiedIds.update(set => {
          const newSet = new Set(set);
          newSet.delete(mediaId);
          return newSet;
        });
      } else {
        // Aggiungi al backend
        await firstValueFrom(this.http.post(`${this.apiUrl}/following`, {
          profileId: profile.id,
          mediaId,
          mediaType,
          title,
          posterUrl,
          backdropUrl
        }));
        this.upcomingNotifiedIds.update(set => {
          const newSet = new Set(set);
          newSet.add(mediaId);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error toggling following state:', error);
    }
  }
}
