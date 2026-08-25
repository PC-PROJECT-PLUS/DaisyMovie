import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Title } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private platformId = inject(PLATFORM_ID);
  private titleService = inject(Title);
  
  // The currently selected global category
  activeCategory = signal<string>('Film');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const savedCategory = localStorage.getItem('daisy-active-category');
      if (savedCategory) {
        this.activeCategory.set(savedCategory);
      }
      this.updateTitle(this.activeCategory());
    }
  }

  setCategory(category: string) {
    this.activeCategory.set(category);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('daisy-active-category', category);
      this.updateTitle(category);
    }
  }

  private updateTitle(category: string) {
    this.titleService.setTitle(`DaisyMovie - ${category}`);
  }
}
