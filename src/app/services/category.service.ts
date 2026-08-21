import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private platformId = inject(PLATFORM_ID);
  
  // The currently selected global category
  activeCategory = signal<string>('Film');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const savedCategory = localStorage.getItem('daisy-active-category');
      if (savedCategory) {
        this.activeCategory.set(savedCategory);
      }
    }
  }

  setCategory(category: string) {
    this.activeCategory.set(category);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('daisy-active-category', category);
    }
  }
}
