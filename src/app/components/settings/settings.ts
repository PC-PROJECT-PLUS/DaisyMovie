import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResponsiveService } from '../../services/responsive';
import { SettingsMobile } from './settings-mobile/settings-mobile';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SettingsMobile],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class Settings {
  responsiveService = inject(ResponsiveService);
  themeService = inject(ThemeService);

  activeTab = signal<'account' | 'profile' | 'playback' | 'language' | 'appearance' | 'family'>('account');

  // Profiles State
  profiles = signal([
    {
      id: 1,
      name: 'Luca',
      email: 'luca@example.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      bio: "Appassionato di fantascienza e thriller psicologici.",
      familyControls: { pinRequired: true, maturityRating: '16+' }
    },
    {
      id: 2,
      name: 'Alex',
      email: 'alex@example.com',
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&auto=format&fit=crop&q=80',
      bio: "Amante degli anime e dell'animazione.",
      familyControls: { pinRequired: false, maturityRating: '18+' }
    },
    {
      id: 3,
      name: 'Bambini',
      email: 'kids@example.com',
      avatar: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=150&auto=format&fit=crop&q=80',
      bio: "Spazio sicuro per i più piccoli.",
      familyControls: { pinRequired: false, maturityRating: '7+' }
    }
  ]);

  selectedProfileId = signal<number>(1);

  get selectedProfile() {
    return this.profiles().find(p => p.id === this.selectedProfileId()) || this.profiles()[0];
  }

  // Available avatars
  avatars = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=150&auto=format&fit=crop&q=80'
  ];

  // Account
  accountPlan = {
    name: 'Premium 4K',
    price: '15,99€',
    nextBilling: '12 Ottobre 2026',
    paymentMethod: 'Visa termina con 4242'
  };

  // Playback
  playbackPrefs = {
    quality: '1080p',
    autoplayNext: true,
    autoplayTrailers: true,
    skipIntro: false
  };

  // Language & Subtitles
  languagePrefs = {
    audio: 'it',
    subtitle: 'it',
    alwaysShowSubs: true,
    subSize: 'medium',
    subStyle: 'drop-shadow'
  };

  // Custom Select Options
  qualityOptions = [
    { value: 'auto', label: 'Auto (Consigliata)' },
    { value: '480p', label: 'Risparmio Dati (480p)' },
    { value: '1080p', label: 'Alta Qualità (1080p)' },
    { value: '4k', label: 'Ultra HD (4K)' }
  ];

  audioOptions = [
    { value: 'it', label: 'Italiano' },
    { value: 'en', label: 'Inglese (Originale)' },
    { value: 'es', label: 'Spagnolo' },
    { value: 'fr', label: 'Francese' }
  ];

  subtitleOptions = [
    { value: 'off', label: 'Spento' },
    { value: 'it', label: 'Italiano' },
    { value: 'en', label: 'Inglese (CC)' }
  ];

  sizeOptions = [
    { value: 'small', label: 'Piccolo' },
    { value: 'medium', label: 'Medio' },
    { value: 'large', label: 'Grande' }
  ];

  styleOptions = [
    { value: 'drop-shadow', label: 'Ombreggiatura' },
    { value: 'outline', label: 'Bordo Nero' },
    { value: 'bg-box', label: 'Sfondo Scuro' }
  ];

  openDropdown = signal<string | null>(null);

  getOptionLabel(options: any[], value: string) {
    return options.find(o => o.value === value)?.label || value;
  }

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

  pin = signal<string[]>(['', '', '', '']);

  onPinInput(event: any, index: number) {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    
    if (value.length > 1) {
      value = value[value.length - 1]; // keep last char
    }
    
    const newPin = [...this.pin()];
    newPin[index] = value;
    this.pin.set(newPin);

    // Auto focus next
    if (value !== '' && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  }

  onPinKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && this.pin()[index] === '' && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  }

  deleteProfile() {
    if (confirm(`Sei sicuro di voler eliminare il profilo ${this.selectedProfile.name}?`)) {
      const newProfiles = this.profiles().filter(p => p.id !== this.selectedProfileId());
      if (newProfiles.length > 0) {
        this.profiles.set(newProfiles);
        this.selectedProfileId.set(newProfiles[0].id);
      }
    }
  }

  setTab(tab: 'account' | 'profile' | 'playback' | 'language' | 'appearance' | 'family') {
    this.activeTab.set(tab);
  }

  selectProfile(id: number) {
    this.selectedProfileId.set(id);
  }

  setTheme(theme: 'light' | 'dark' | 'dynamic') {
    this.themeService.setTheme(theme);
  }
}
