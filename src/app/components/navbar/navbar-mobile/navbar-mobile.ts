import { Component, signal, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

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
}
