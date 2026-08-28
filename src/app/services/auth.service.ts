import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface UserProfile {
  id: number;
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

  isLoggedIn = signal<boolean>(false);
  selectedProfile = signal<UserProfile | null>(null);
  currentUser = signal<User | null>(null);

  private mockProfiles: UserProfile[] = [
    { id: 1, name: 'Luca',   avatar: 'https://i.pravatar.cc/150?img=68', requiresPin: true },
    { id: 2, name: 'Sara',   avatar: 'https://i.pravatar.cc/150?img=47' },
    { id: 3, name: 'Marco',  avatar: 'https://i.pravatar.cc/150?img=12' },
    { id: 4, name: 'Ospite', avatar: 'https://i.pravatar.cc/150?img=3'  },
    { id: 5, name: 'Kids',   avatar: 'https://i.pravatar.cc/150?img=61', isKids: true },
  ];

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const storedAuth = localStorage.getItem('daisy_auth');
        if (storedAuth) {
          const { isLoggedIn, user } = JSON.parse(storedAuth);
          this.isLoggedIn.set(isLoggedIn ?? false);
          this.currentUser.set(user ?? null);
        }
        
        const storedProfile = sessionStorage.getItem('daisy_profile');
        if (storedProfile) {
          this.selectedProfile.set(JSON.parse(storedProfile));
        }
      } catch { /* ignore */ }
    }
  }

  login(email: string, _password: string): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        const user: User = {
          email,
          name: email.split('@')[0],
          profiles: this.mockProfiles,
        };
        this.isLoggedIn.set(true);
        this.currentUser.set(user);
        this.selectedProfile.set(null);
        this.persist();
        resolve();
      }, 900);
    });
  }

  register(email: string, password: string): Promise<void> {
    return this.login(email, password);
  }

  loginWithProvider(_provider: 'google' | 'apple'): Promise<void> {
    const email = _provider === 'google' ? 'utente@gmail.com' : 'utente@icloud.com';
    return this.login(email, '');
  }

  selectProfile(profile: UserProfile): void {
    this.selectedProfile.set(profile);
    this.persist();
  }

  logout(): void {
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
    this.selectedProfile.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('daisy_auth');
      sessionStorage.removeItem('daisy_profile');
    }
  }

  getProfiles(): UserProfile[] {
    return this.currentUser()?.profiles ?? this.mockProfiles;
  }

  private persist(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('daisy_auth', JSON.stringify({
        isLoggedIn: this.isLoggedIn(),
        user: this.currentUser(),
      }));
      
      const profile = this.selectedProfile();
      if (profile) {
        sessionStorage.setItem('daisy_profile', JSON.stringify(profile));
      } else {
        sessionStorage.removeItem('daisy_profile');
      }
    }
  }
}
