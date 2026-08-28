import { Component, Input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../services/theme.service';
import { PreferencesService, MOCK_HISTORY_ITEMS } from '../../../services/preferences.service';

@Component({
  selector: 'app-settings-mobile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-mobile.html',
  styleUrl: './settings-mobile.scss'
})
export class SettingsMobile {
  @Input() activeTab: 'account' | 'profile' | 'playback' | 'language' | 'appearance' | 'family' = 'account';
  @Input() profiles: any[] = [];
  @Input() selectedProfileId: number = 1;
  @Input() selectedProfile: any;
  @Input() avatars: string[] = [];
  @Input() accountPlan: any;
  @Input() playbackPrefs: any;
  @Input() languagePrefs: any;
  @Input() qualityOptions: any[] = [];
  @Input() audioOptions: any[] = [];
  @Input() subtitleOptions: any[] = [];
  @Input() sizeOptions: any[] = [];
  @Input() styleOptions: any[] = [];
  @Input() themeService!: ThemeService;

    preferencesService = inject(PreferencesService);
  availableHistoryItems = MOCK_HISTORY_ITEMS;
  isHistoryDropdownOpen = signal(false);

  get historyHeroLabel(): string {
    const id = this.preferencesService.historyHeroMovieId();
    if (!id) return 'Predefinito (Ultimo film visto)';
    return this.availableHistoryItems.find(m => m.id === id)?.title || 'Sconosciuto';
  }

  selectHistoryHero(id: number | null) {
    this.preferencesService.setHistoryHeroMovieId(id);
    this.isHistoryDropdownOpen.set(false);
  }

  openDropdown = signal<string | null>(null);

  onTabChange = output<'account' | 'profile' | 'playback' | 'language' | 'appearance' | 'family'>();
  onProfileChange = output<number>();

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
  onDeleteProfile = output<void>();

  onPinInput(event: any, index: number) {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    if (value.length > 1) value = value[value.length - 1];
    
    const newPin = [...this.pin()];
    newPin[index] = value;
    this.pin.set(newPin);

    if (value !== '' && index < 3) {
      const nextInput = document.getElementById(`pin-mob-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  }

  onPinKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && this.pin()[index] === '' && index > 0) {
      const prevInput = document.getElementById(`pin-mob-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  }

  deleteProfile() {
    this.onDeleteProfile.emit();
  }

  setTab(tab: 'account' | 'profile' | 'playback' | 'language' | 'appearance' | 'family') {
    this.onTabChange.emit(tab);
  }

  selectProfile(id: number) {
    this.onProfileChange.emit(id);
  }

  setTheme(theme: 'light' | 'dark' | 'dynamic') {
    this.themeService.setTheme(theme);
  }
}



