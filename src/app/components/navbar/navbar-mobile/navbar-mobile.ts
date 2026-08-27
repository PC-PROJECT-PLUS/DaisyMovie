import { Component, signal, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CategoryService } from '../../../services/category.service';
import { NotificationsMobile } from './notifications-mobile/notifications-mobile';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar-mobile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NotificationsMobile],
  templateUrl: './navbar-mobile.html',
  styleUrl: './navbar-mobile.scss',
})
export class NavbarMobile {
  isSearchExpanded = signal<boolean>(false);
  isMenuOpen = signal<boolean>(false);
  isGenresOpen = signal<boolean>(false);
  isNotificationsOpen = signal<boolean>(false);
  searchQuery = signal<string>('');
  
  private elementRef = inject(ElementRef);
  private router = inject(Router);
  public categoryService = inject(CategoryService);
  private authService = inject(AuthService);

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

  openNotifications() {
    this.isNotificationsOpen.set(true);
    this.isMenuOpen.set(false);
  }

  closeNotifications() {
    this.isNotificationsOpen.set(false);
  }

  onSearchEnter() {
    const q = this.searchQuery().trim();
    if (q) {
      this.toggleMenu();
      this.router.navigate(['/search'], { queryParams: { q } });
    }
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
    if (category === 'Animazione') return 'Animazione';
    if (category === 'Anime') return 'Anime';
    return 'Movie';
  }

  getLogoWidth(): string {
    const category = this.categoryService.activeCategory();
    if (category === 'Serie TV') return '135px';
    if (category === 'Animazione') return '190px';
    if (category === 'Anime') return '125px';
    return '125px'; // Movie
  }

  logout() {
    this.authService.logout();
    this.isMenuOpen.set(false);
    this.router.navigate(['/auth']);
  }
}
