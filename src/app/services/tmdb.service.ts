import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TmdbService {
  private http = inject(HttpClient);
  // URL del nostro backend locale (aggiornalo se cambi porta o dominio)
  private BFF_URL = 'http://localhost:3000/api/movies';
  private homeCache = new Map<string, any>();

  /**
   * Fetch all home data concurrently from the backend
   * @param category 
   */
  getHomeData(category: string, phase: string = 'all'): Observable<any> {
    const key = `${category}_${phase}`;
    if (this.homeCache.has(key)) {
      return of(this.homeCache.get(key));
    }
    return this.http.get<any>(`${this.BFF_URL}/home?category=${encodeURIComponent(category)}&phase=${phase}`).pipe(
      tap(data => this.homeCache.set(key, data))
    );
  }

  /**
   * Fetch a specific paginated list
   */
  getCategoryPage(listName: string, category: string, page: number): Observable<any> {
    return this.http.get<any>(`${this.BFF_URL}/page?listName=${listName}&category=${encodeURIComponent(category)}&page=${page}`);
  }

  /**
   * Fetch top 10 trending items for a specific period
   */
  getTrendingTop10(category: string, period: string): Observable<any> {
    return this.http.get<any>(`${this.BFF_URL}/trending-top10?category=${encodeURIComponent(category)}&period=${period}`);
  }

  /**
   * Fetch dynamic genre list
   */
  getGenreList(category: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.BFF_URL}/genre-list?category=${encodeURIComponent(category)}`);
  }
}
