import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  public currentTheme = signal<'dark' | 'light' | 'dynamic'>('dark');

  setTheme(theme: 'dark' | 'light' | 'dynamic') {
    this.currentTheme.set(theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }
}
