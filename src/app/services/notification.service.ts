import { Injectable, signal, PLATFORM_ID, inject, effect, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { PreferencesService } from './preferences.service';
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
  
  rawNotifications = signal<AppNotification[]>([]);
  notifications = computed(() => {
    if (!this.preferencesService.showOldBell()) {
      return [];
    }
    return this.rawNotifications().filter(n => {
      const title = n.title.toLowerCase();
      
      // Novità Preferiti
      if (title.includes('nuovo episodio') || title.includes('novità in arrivo') || title.includes('novità preferiti')) {
        return this.preferencesService.showOldFavorites();
      }
      // Promemoria Cronologia
      if (title.includes('continua a guardare') || title.includes('promemoria cronologia') || title.includes('metà')) {
        return this.preferencesService.showOldHistory();
      }
      // Raccomandazioni
      if (title.includes('consigliato') || title.includes('nuova aggiunta') || title.includes('raccomandazioni')) {
        return this.preferencesService.showOldRecommendations();
      }
      // Film in uscita (Campanella Home)
      if (title.includes('novità in catalogo') || title.includes('in uscita') || title.includes('ora disponibile') || title.includes('film in uscita')) {
        return this.preferencesService.showOldUpcoming();
      }
      
      return true;
    });
  });

  upcomingNotifiedIds = signal<Set<number>>(new Set<number>());
  emailDigestEnabled = signal<boolean>(true);
  
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private preferencesService = inject(PreferencesService);
  private apiUrl = environment.apiUrl;
  
  private pollingInterval: any;
  
  async fetchNotifications(profileId: string) {
    try {
      const data = await firstValueFrom(this.http.get<any[]>(`${this.apiUrl}/notifications?profileId=${profileId}`));
      
      this.rawNotifications.set(data);
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
          this.startPolling(profile.id);
        } else {
          this.rawNotifications.set([]);
          this.stopPolling();
        }
      });
    }
  }

  private startPolling(profileId: string) {
    this.stopPolling();
    this.pollingInterval = setInterval(() => {
      this.fetchNotifications(profileId);
    }, 30000); // Poll every 30 seconds
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
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
    if (!this.preferencesService.notifyBell()) return; // Disabilita tutto se disattivata la campanella principale
    
    let newNotifs: AppNotification[] = [];
    
    // 1. Check favorites for 'New Episodes' or 'News'
    if (this.preferencesService.notifyFavorites() && favorites && favorites.length > 0) {
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
    if (this.preferencesService.notifyHistory() && history && history.length > 0) {
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
    } else if (this.preferencesService.notifyRecommendations()) {
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
    const current = this.rawNotifications();
    const toAdd = newNotifs.filter(n => !current.find(c => c.title === n.title));
    
    if (toAdd.length > 0) {
      this.rawNotifications.update(curr => [...toAdd, ...curr].slice(0, 15)); // Keep max 15
    }
  }

  public async markAsRead(id: string) {
    const notifs = this.rawNotifications();
    const index = notifs.findIndex(n => n.id === id);
    if (index !== -1 && notifs[index].unread) {
      const newNotifs = [...notifs];
      newNotifs[index].unread = false;
      this.rawNotifications.set(newNotifs);
      
      try {
        await firstValueFrom(this.http.put(`${this.apiUrl}/notifications/${id}/read`, {}));
      } catch (error) {
        console.error('Failed to mark notification as read in DB:', error);
      }
    }
  }

  async markAllAsRead() {
    const profile = this.authService.selectedProfile();
    const newNotifs = this.rawNotifications().map(n => ({ ...n, unread: false }));
    this.rawNotifications.set(newNotifs);
    
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
