import { Component, signal, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CategoryService } from '../../../services/category.service';

@Component({
  selector: 'app-navbar-mobile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './navbar-mobile.html',
  styleUrl: './navbar-mobile.scss',
})
export class NavbarMobile {
  isSearchExpanded = signal<boolean>(false);
  isMenuOpen = signal<boolean>(false);
  isGenresOpen = signal<boolean>(false);
  searchQuery = signal<string>('');
  
  private elementRef = inject(ElementRef);
  private router = inject(Router);
  public categoryService = inject(CategoryService);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.isMenuOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.isMenuOpen.set(false);
      this.isGenresOpen.set(false);
    }
  }

  genresList = [
    { name: 'horror', label: 'Horror' },
    { name: 'western', label: 'Western' },
    { name: 'fantasy', label: 'Fantasy' },
    { name: 'thriller', label: 'Thriller' },
    { name: 'romanzo', label: 'Romanzo' },
    { name: 'storico', label: 'Storico' },
    { name: 'fantascienza', label: 'Fantascienza' },
    { name: 'avventura', label: 'Avventura' },
    { name: 'biografia', label: 'Biografia' }
  ];

  toggleSearch() {
    this.isSearchExpanded.set(!this.isSearchExpanded());
  }

  toggleMenu() {
    this.isMenuOpen.set(!this.isMenuOpen());
    if (!this.isMenuOpen()) {
      this.isGenresOpen.set(false);
    }
  }

  toggleGenres() {
    this.isGenresOpen.set(!this.isGenresOpen());
  }

  setCategory(tab: string) {
    this.categoryService.setCategory(tab);
    if (this.router.url !== '/') {
      this.router.navigate(['/']);
    }
    this.toggleMenu();
  }

  getLogoText(): string {
    const category = this.categoryService.activeCategory();
    if (category === 'Serie TV') return 'SerieTV';
    if (category === 'Animazione') return 'Animation';
    if (category === 'Anime') return 'Anime';
    return 'Movie';
  }

  getLogoWidth(): string {
    const category = this.categoryService.activeCategory();
    if (category === 'Serie TV') return '135px';
    if (category === 'Animazione') return '155px';
    if (category === 'Anime') return '125px';
    return '125px'; // Movie
  }
}
