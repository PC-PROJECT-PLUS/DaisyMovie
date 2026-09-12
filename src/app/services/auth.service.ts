import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  isKids?: boolean;
  requiresPin?: boolean;
}

export interface User {
  email: string;
  name: string;
  profiles: UserProfile[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  isLoggedIn = signal<boolean>(false);
  selectedProfile = signal<UserProfile | null>(null);
  currentUser = signal<User | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const token = localStorage.getItem('daisy_token');
        if (token) {
          this.isLoggedIn.set(true);
          const payload = JSON.parse(atob(token.split('.')[1]));
          this.currentUser.set({
            email: payload.email,
            name: payload.email.split('@')[0],
            profiles: []
          });
          this.fetchProfiles();
        }
        
        const storedProfile = sessionStorage.getItem('daisy_profile');
        if (storedProfile) {
          this.selectedProfile.set(JSON.parse(storedProfile));
        }
      } catch { /* ignore */ }
    }
  }

  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/auth/login`, { email, password }));
    this.handleAuthSuccess(res.token, email);
  }

  async register(email: string, password: string): Promise<void> {
    await firstValueFrom(this.http.post<any>(`${this.apiUrl}/auth/register`, { email, password }));
  }

  async verify(email: string, code: string): Promise<void> {
    const res = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/auth/verify`, { email, code }));
    this.handleAuthSuccess(res.token, email);
  }

  async loginWithGoogleCode(code: string): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/auth/google`, { code }));
      // We don't have the email immediately, but JWT parsing logic or a new profile fetch will happen
      this.handleAuthSuccess(res.token, 'Google User'); 
      this.router.navigate(['/profile']);
    } catch (err) {
      console.error('Google login backend error:', err);
      throw err;
    }
  }

  async loginWithProvider(provider: 'google' | 'apple'): Promise<void> {
    // For apple or other future stuff
    throw new Error(`Provider ${provider} non implementato.`);
  }

  private handleAuthSuccess(token: string, email: string) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('daisy_token', token);
    }
    this.isLoggedIn.set(true);
    this.currentUser.set({
      email: email,
      name: email.split('@')[0],
      profiles: []
    });
    this.fetchProfiles();
  }

  selectProfile(profile: UserProfile): void {
    this.selectedProfile.set(profile);
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem('daisy_profile', JSON.stringify(profile));
    }
  }

  logout(): void {
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
    this.selectedProfile.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('daisy_token');
      sessionStorage.removeItem('daisy_profile');
    }
    this.router.navigate(['/auth/login']);
  }

  async fetchProfiles(): Promise<void> {
    try {
      const profiles = await firstValueFrom(this.http.get<UserProfile[]>(`${this.apiUrl}/profiles`));
      this.currentUser.update(u => u ? { ...u, profiles } : null);
    } catch (e) {
      console.error('Failed to fetch profiles', e);
    }
  }
  
  async createProfile(name: string, avatar?: string, isKids?: boolean): Promise<UserProfile> {
    const newProfile = await firstValueFrom(this.http.post<UserProfile>(`${this.apiUrl}/profiles`, { name, avatar, isKids }));
    await this.fetchProfiles();
    return newProfile;
  }

  getProfiles(): UserProfile[] {
    return this.currentUser()?.profiles ?? [];
  }
}
