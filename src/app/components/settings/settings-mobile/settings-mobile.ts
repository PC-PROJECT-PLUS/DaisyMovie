import { Component, signal, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Settings } from '../settings';

@Component({
  selector: 'app-settings-mobile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-mobile.html',
  styleUrl: './settings-mobile.scss'
})
export class SettingsMobile {
  // We can just inject the parent Settings component to share all its logic!
  parent = inject(Settings);
  
  openDropdown = signal<string | null>(null);

  toggleDropdown(dropdownName: string) {
    if (this.openDropdown() === dropdownName) {
      this.openDropdown.set(null);
    } else {
      this.openDropdown.set(dropdownName);
    }
  }

  closeDropdowns() {
    this.openDropdown.set(null);
  }
  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    this.closeDropdowns();
  }
}
