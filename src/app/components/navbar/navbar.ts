import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar {
  activeTab = signal<string>('Film');
  isSearchExpanded = signal<boolean>(false);
  searchQuery = signal<string>('');
  isUserMenuOpen = signal<boolean>(false);
  currentTheme = signal<'dark' | 'light' | 'dynamic'>('dark');

  navItems = ['Film', 'Serie TV', 'Animazione', 'Anime'];

  themeChange = output<'dark' | 'light' | 'dynamic'>();

  indicatorStyle = signal({ left: '0px', width: '32px' });

  setActiveTab(tab: string, event?: Event) {
    this.activeTab.set(tab);
    if (event) {
      const target = event.currentTarget as HTMLElement;
      this.indicatorStyle.set({
        left: target.offsetLeft + 'px',
        width: target.offsetWidth + 'px'
      });
    }
  }

  toggleSearch() {
    this.isSearchExpanded.update(v => !v);
  }

  onSearchFocus() {
    this.isSearchExpanded.set(true);
  }

  onSearchBlur() {
    if (!this.searchQuery()) {
      this.isSearchExpanded.set(false);
    }
  }

  setTheme(theme: 'dark' | 'light' | 'dynamic') {
    this.currentTheme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
    this.themeChange.emit(theme);
  }

  toggleUserMenu(state?: boolean) {
    if (state !== undefined) {
      this.isUserMenuOpen.set(state);
    } else {
      this.isUserMenuOpen.update(v => !v);
    }
  }
}
