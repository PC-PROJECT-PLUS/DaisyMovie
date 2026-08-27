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
        const stored = localStorage.getItem('daisy_auth');
        if (stored) {
          const { isLoggedIn, user, profile } = JSON.parse(stored);
          this.isLoggedIn.set(isLoggedIn ?? false);
          this.currentUser.set(user ?? null);
          this.selectedProfile.set(profile ?? null);
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
        profile: this.selectedProfile(),
      }));
    }
  }
}
