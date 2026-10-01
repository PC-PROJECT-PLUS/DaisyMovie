import { Component, signal, inject, computed, effect, HostListener, ElementRef, OnInit, OnDestroy, ViewChild, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ConnectedPosition, Overlay, OverlayModule, ScrollStrategy } from '@angular/cdk/overlay';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ResponsiveService } from '../../services/responsive';
import { SettingsMobile } from './settings-mobile/settings-mobile';
import { PreferencesService } from '../../services/preferences.service';
import { FavoritesService } from '../../services/favorites.service';
import { HistoryService } from '../../services/history.service';
import { AuthService } from '../../services/auth.service';
import { LoaderService } from '../../services/loader.service';

interface SettingsDropdownOption {
  label: string;
  value: string | number | null;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SettingsMobile, OverlayModule, ScrollingModule],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class Settings implements OnInit, OnDestroy {
  responsiveService = inject(ResponsiveService);
  titleService = inject(Title);
  preferencesService = inject(PreferencesService);
  favoritesService = inject(FavoritesService);
  historyService = inject(HistoryService);
  authService = inject(AuthService);
  loaderService = inject(LoaderService);
  private overlay = inject(Overlay);

  activeTab = signal<'favorites' | 'notifications' | 'appearance' | 'profiles' | 'account' | 'playback'>('account');

  // Computed data
  availableHistoryItems = computed(() => this.historyService.items());
  recentHistoryItems = computed(() => this.historyService.items().slice(0, 100));
  availableFavoritesItems = computed(() => this.favoritesService.items());
  collections = computed(() => this.favoritesService.collections());

  // UI state for comboboxes
  isHistoryDropdownOpen = signal(false);
  isFavoritesDropdownOpen = signal(false);
  isDefaultCollectionDropdownOpen = signal(false);

  // Modals state
  isDeleteAccountModalOpen = signal(false);
  isDeletingAccount = signal(false);
  isClosingModal = signal(false);

  // Playback state
  isLanguageDropdownOpen = signal(false);
  isSeriesLanguageDropdownOpen = signal(false);
  isFilmLanguageDropdownOpen = signal(false);
  activeSettingsDropdown = signal<string | null>(null);
  settingsDropdownAttached = signal(false);
  settingsDropdownExpanded = signal(false);
  settingsDropdownLabel = signal('');
  settingsDropdownOptions = signal<SettingsDropdownOption[]>([]);
  settingsDropdownWidth = signal(220);
  settingsDropdownOrigin = signal<ElementRef<HTMLElement> | null>(null);
  fallbackOverlayOrigin: ElementRef<HTMLElement>;
  settingsDropdownPositions: ConnectedPosition[] = [
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'top' },
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'bottom' },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'top' },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'bottom' }
  ];
  settingsDropdownScrollStrategy: ScrollStrategy = this.overlay.scrollStrategies.reposition();
  private dropdownCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private dropdownDetachTimer: ReturnType<typeof setTimeout> | null = null;
  private dropdownOpenFrame = 0;
  platformId = inject(PLATFORM_ID);
  languageOptions = [
    { value: 'it', label: 'Italiano' },
    { value: 'en', label: 'Inglese' },
    { value: 'original', label: 'Lingua Originale' }
  ];

  constructor(private elementRef: ElementRef) {
    this.fallbackOverlayOrigin = new ElementRef(elementRef.nativeElement);
    this.titleService.setTitle('Impostazioni');

    effect(() => {
      const url = this.displayBgUrl();
      if (!url) {
        this.loaderService.setRouteReady();
        return;
      }

      if (!this.heroImageA()) {
        this.heroImageA.set(url);
        // We set route ready when the first image is physically loaded
        const img = new Image();
        img.onload = () => {
          this.loaderService.setRouteReady();
        };
        img.onerror = () => {
          this.loaderService.setRouteReady();
        };
        img.src = url;
        return;
      }

      if (this.activeHero() === 'a' && this.heroImageA() === url) return;
      if (this.activeHero() === 'b' && this.heroImageB() === url) return;

      if (isPlatformBrowser(this.platformId)) {
        if (this.heroImageA() === url) {
          this.activeHero.set('a');
          return;
        }
        if (this.heroImageB() === url) {
          this.activeHero.set('b');
          return;
        }

        const img = new Image();
        img.onload = () => {
          if (this.activeHero() === 'a') {
            this.heroImageB.set(url);
            this.activeHero.set('b');
          } else {
            this.heroImageA.set(url);
            this.activeHero.set('a');
          }
        };
        img.onerror = () => {
          // Fallback if image fails to load gracefully
          if (this.activeHero() === 'a') {
            this.heroImageB.set(url);
            this.activeHero.set('b');
          } else {
            this.heroImageA.set(url);
            this.activeHero.set('a');
          }
        };
        img.src = url;
      } else {
        this.heroImageA.set(url);
      }
    });
  }

  ngOnInit() {
    // La logica del loader è ora gestita nell'effect per aspettare l'immagine di sfondo
    // Se non ci sono sfondi, viene chiamato subito setRouteReady nell'effect.
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement | null;
    if (target?.closest('.settings-select-anchor, .settings-global-dropdown-panel, .custom-select-wrapper')) return;

    this.closeSettingsDropdown();
    if (this.elementRef.nativeElement.contains(event.target)) return;

    this.isHistoryDropdownOpen.set(false);
    this.isFavoritesDropdownOpen.set(false);
    this.isDefaultCollectionDropdownOpen.set(false);
    this.isLanguageDropdownOpen.set(false);
    this.isSeriesLanguageDropdownOpen.set(false);
    this.isFilmLanguageDropdownOpen.set(false);
    this.isGlobalBgCollectionDropdownOpen.set(false);
  }



  openSettingsDropdown(
    event: MouseEvent,
    key: string,
    label: string,
    options: SettingsDropdownOption[],
    width = 220
  ) {
    const trigger = event.currentTarget as HTMLElement;
    this.cancelSettingsDropdownClose();
    if (this.dropdownDetachTimer) {
      clearTimeout(this.dropdownDetachTimer);
      this.dropdownDetachTimer = null;
    }

    const triggerWidth = trigger.getBoundingClientRect().width;
    this.settingsDropdownOrigin.set(new ElementRef(trigger));
    this.settingsDropdownWidth.set(Math.max(width, triggerWidth));
    this.settingsDropdownLabel.set(label);
    this.settingsDropdownOptions.set(options);

    if (this.activeSettingsDropdown() === key && this.settingsDropdownAttached()) {
      this.settingsDropdownExpanded.set(true);
      return;
    }

    this.activeSettingsDropdown.set(key);
    this.settingsDropdownExpanded.set(false);
    this.settingsDropdownAttached.set(true);
    if (this.dropdownOpenFrame) cancelAnimationFrame(this.dropdownOpenFrame);
    this.dropdownOpenFrame = requestAnimationFrame(() => {
      this.dropdownOpenFrame = 0;
      if (this.settingsDropdownAttached()) this.settingsDropdownExpanded.set(true);
    });
  }

  scheduleSettingsDropdownClose() {
    this.cancelSettingsDropdownClose();
    this.dropdownCloseTimer = setTimeout(() => this.closeSettingsDropdown(), 80);
  }

  cancelSettingsDropdownClose() {
    if (this.dropdownCloseTimer) {
      clearTimeout(this.dropdownCloseTimer);
      this.dropdownCloseTimer = null;
    }
  }

  closeSettingsDropdown() {
    this.cancelSettingsDropdownClose();
    if (!this.settingsDropdownAttached()) return;
    if (this.dropdownOpenFrame) {
      cancelAnimationFrame(this.dropdownOpenFrame);
      this.dropdownOpenFrame = 0;
    }
    this.settingsDropdownExpanded.set(false);
    if (this.dropdownDetachTimer) clearTimeout(this.dropdownDetachTimer);
    this.dropdownDetachTimer = setTimeout(() => {
      this.settingsDropdownAttached.set(false);
      this.activeSettingsDropdown.set(null);
      this.settingsDropdownOrigin.set(null);
      this.dropdownDetachTimer = null;
    }, 300);
  }

  selectSettingsDropdownOption(option: SettingsDropdownOption) {
    switch (this.activeSettingsDropdown()) {
      case 'defaultCollection': this.setDefaultCollection(option.value as number | null); break;
      case 'globalBackgroundCollection': this.setGlobalBgCollection(option.value as number | null); break;
      case 'language': this.setLanguage(option.value as string); break;
      case 'seriesLanguage': this.setDefaultSeriesLanguage(option.value as string); break;
      case 'filmLanguage': this.setDefaultFilmLanguage(option.value as string); break;
      case 'trailerLanguage': this.setTrailerCaptionLang(option.value as string); break;
    }
    this.closeSettingsDropdown();
  }

  ngOnDestroy() {
    this.cancelSettingsDropdownClose();
    if (this.dropdownDetachTimer) clearTimeout(this.dropdownDetachTimer);
    if (this.dropdownOpenFrame) cancelAnimationFrame(this.dropdownOpenFrame);
  }

  // --- APPEARANCE ---
  get glassBlur() { return this.preferencesService.glassBlur(); }
  set glassBlur(val: number) { this.preferencesService.glassBlur.set(val); this.preferencesService.savePreferences(); }

  get glassOpacity() { return this.preferencesService.glassOpacity(); }
  set glassOpacity(val: number) { this.preferencesService.glassOpacity.set(val); this.preferencesService.savePreferences(); }

  resetAppearance() {
    this.preferencesService.glassBlur.set(28);
    this.preferencesService.glassOpacity.set(10);
    this.preferencesService.theme.set('dynamic');
    this.preferencesService.savePreferences();
  }

  get globalBackgroundUrl() { return this.preferencesService.globalBackgroundUrl(); }
  setGlobalBackgroundUrl(url: string | null) {
    // Quando si seleziona uno sfondo globale, puliamo lo sfondo specifico delle impostazioni 
    // così l'utente vede immediatamente il risultato della sua scelta.
    if (url !== null) {
      this.tempSettingsBgUrl.set(null);
      this.preferencesService.settingsBackgroundUrl.set(null);
    }

    this.preferencesService.globalBackgroundUrl.set(url);
    this.preferencesService.savePreferences();
  }

  isGlobalBgCollectionDropdownOpen = signal(false);
  globalBgCollectionId = signal<number | null>(null);
  trackGlobalBackdropItem = (index: number, item: any) =>
    `${this.globalBgCollectionId() ?? 'all'}:${item.media_id ?? index}`;

  get globalBgCollectionLabel() {
    if (!this.globalBgCollectionId()) return 'Tutti i preferiti (default)';
    const c = this.collections().find((x: any) => x.id === this.globalBgCollectionId());
    return c ? c.name : 'Tutti i preferiti (default)';
  }

  get defaultCollectionOptions(): SettingsDropdownOption[] {
    return [
      { label: 'Tutti i preferiti (default)', value: null },
      ...this.collections().map(collection => ({ label: collection.name, value: collection.id }))
    ];
  }

  get globalBgCollectionOptions(): SettingsDropdownOption[] {
    return [
      { label: 'Tutti i preferiti (default)', value: null },
      ...this.collections().map(collection => ({ label: collection.name, value: collection.id }))
    ];
  }

  setGlobalBgCollection(id: number | null) {
    this.globalBgCollectionId.set(id);
  }

  get settingsBackgroundUrl() { return this.preferencesService.settingsBackgroundUrl(); }

  tempSettingsBgUrl = signal<string | null>(null);

  displayBgUrl = computed(() => {
    return this.tempSettingsBgUrl() || this.preferencesService.settingsBackgroundUrl() || this.preferencesService.globalBackgroundUrl();
  });

  heroImageA = signal<string>('');
  heroImageB = signal<string>('');
  activeHero = signal<'a' | 'b'>('a');

  onSettingsBackgroundSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Imposta subito un object URL per un'animazione CSS fluida
      this.tempSettingsBgUrl.set(URL.createObjectURL(file));

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 720;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);

            let quality = 0.7;
            let compressed = canvas.toDataURL('image/jpeg', quality);

            // Loop per abbassare la qualità finché la stringa base64 è < 90KB (~120000 char)
            // Questo previene l'errore 413 Payload Too Large dal backend Express (limite default 100KB)
            while (compressed.length > 90000 && quality > 0.1) {
              quality -= 0.1;
              compressed = canvas.toDataURL('image/jpeg', quality);
            }

            this.preferencesService.settingsBackgroundUrl.set(compressed);
            this.preferencesService.savePreferences();
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeSettingsBackground() {
    this.tempSettingsBgUrl.set(null);
    this.preferencesService.settingsBackgroundUrl.set(null);
    this.preferencesService.savePreferences();
  }

  // --- NOTIFICATIONS ---
  get notifyBell() { return this.preferencesService.notifyBell(); }
  set notifyBell(v: boolean) { this.preferencesService.notifyBell.set(v); this.preferencesService.savePreferences(); }

  get notifyFavorites() { return this.preferencesService.notifyFavorites(); }
  set notifyFavorites(v: boolean) { this.preferencesService.notifyFavorites.set(v); this.preferencesService.savePreferences(); }

  get notifyHistory() { return this.preferencesService.notifyHistory(); }
  set notifyHistory(v: boolean) { this.preferencesService.notifyHistory.set(v); this.preferencesService.savePreferences(); }

  get notifyRecommendations() { return this.preferencesService.notifyRecommendations(); }
  set notifyRecommendations(v: boolean) { this.preferencesService.notifyRecommendations.set(v); this.preferencesService.savePreferences(); }

  get notifyUpcoming() { return this.preferencesService.notifyUpcoming(); }
  set notifyUpcoming(v: boolean) { this.preferencesService.notifyUpcoming.set(v); this.preferencesService.savePreferences(); }

  get showOldBell() { return this.preferencesService.showOldBell(); }
  set showOldBell(v: boolean) { this.preferencesService.showOldBell.set(v); this.preferencesService.savePreferences(); }

  get showOldFavorites() { return this.preferencesService.showOldFavorites(); }
  set showOldFavorites(v: boolean) { this.preferencesService.showOldFavorites.set(v); this.preferencesService.savePreferences(); }

  get showOldHistory() { return this.preferencesService.showOldHistory(); }
  set showOldHistory(v: boolean) { this.preferencesService.showOldHistory.set(v); this.preferencesService.savePreferences(); }

  get showOldRecommendations() { return this.preferencesService.showOldRecommendations(); }
  set showOldRecommendations(v: boolean) { this.preferencesService.showOldRecommendations.set(v); this.preferencesService.savePreferences(); }

  get showOldUpcoming() { return this.preferencesService.showOldUpcoming(); }
  set showOldUpcoming(v: boolean) { this.preferencesService.showOldUpcoming.set(v); this.preferencesService.savePreferences(); }


  // --- FAVORITES & HERO BACKGROUND ---
  get defaultCollectionId() { return this.preferencesService.defaultCollectionId(); }
  setDefaultCollection(id: number | null) {
    this.preferencesService.defaultCollectionId.set(id);
    this.preferencesService.savePreferences();
    this.isDefaultCollectionDropdownOpen.set(false);
  }

  get defaultCollectionLabel() {
    const id = this.defaultCollectionId;
    if (!id) return 'Tutti i preferiti (default)';
    const c = this.collections().find(c => c.id === id);
    return c ? c.name : 'Tutti i preferiti (default)';
  }

  get collectionHeroModes() { return this.preferencesService.collectionHeroModes(); }

  getCollectionHeroMode(collectionId: number | 'all'): 'dynamic' | 'fixed' {
    return this.collectionHeroModes[collectionId]?.mode || 'dynamic';
  }

  getCollectionFixedMediaId(collectionId: number | 'all'): number | null {
    return this.collectionHeroModes[collectionId]?.mediaId || null;
  }

  toggleCollectionHeroMode(collectionId: number | 'all') {
    const current = this.getCollectionHeroMode(collectionId);
    const newMode = current === 'dynamic' ? 'fixed' : 'dynamic';

    const modes = { ...this.collectionHeroModes };
    if (!modes[collectionId]) modes[collectionId] = {};
    modes[collectionId].mode = newMode;

    // If we switch to fixed but no mediaId is set, we could pick the first one
    if (newMode === 'fixed' && !modes[collectionId].mediaId) {
      const items = this.itemsPerCollection().get(collectionId) || [];
      if (items.length > 0) {
        modes[collectionId].mediaId = items[0].media_id;
      }
    }

    this.preferencesService.collectionHeroModes.set(modes);
    this.preferencesService.savePreferences();
  }

  setCollectionFixedMediaId(collectionId: number | 'all', mediaId: number) {
    const modes = { ...this.collectionHeroModes };
    if (!modes[collectionId]) modes[collectionId] = {};
    modes[collectionId].mode = 'fixed';
    modes[collectionId].mediaId = mediaId;
    this.preferencesService.collectionHeroModes.set(modes);
    this.preferencesService.savePreferences();
  }

  setAllCollectionsDynamic() {
    const modes = { ...this.collectionHeroModes };
    modes['all'] = { mode: 'dynamic', mediaId: null };
    this.collections().forEach(c => {
      modes[c.id] = { mode: 'dynamic', mediaId: null };
    });
    this.preferencesService.collectionHeroModes.set(modes);
    this.preferencesService.savePreferences();
  }

  scrollSelector(event: Event, direction: 'left' | 'right') {
    const btn = event.currentTarget as HTMLElement;
    const container = btn.parentElement?.querySelector('.history-hero-selector') as HTMLElement;
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
    }
  }

  checkScrollButtons(event: Event) {
    const target = event.target as HTMLElement;
    let container = target;
    let wrapper = target.parentElement;

    // If mouseenter on the wrapper/selector, the target might not be the scroll container
    if (!target.classList.contains('history-hero-selector')) {
      container = target.querySelector('.history-hero-selector') as HTMLElement;
      wrapper = target;
    }

    if (container && wrapper) {
      const leftBtn = wrapper.querySelector('.section-arrow-btn.left') as HTMLElement;
      const rightBtn = wrapper.querySelector('.section-arrow-btn.right') as HTMLElement;

      if (leftBtn) {
        leftBtn.style.opacity = container.scrollLeft > 0 ? '1' : '0';
        leftBtn.style.pointerEvents = container.scrollLeft > 0 ? 'auto' : 'none';
      }
      if (rightBtn) {
        // Use a small threshold (e.g. 2px) for maxScroll
        const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
        rightBtn.style.opacity = (maxScroll > 0 && container.scrollLeft < maxScroll - 2) ? '1' : '0';
        rightBtn.style.pointerEvents = (maxScroll > 0 && container.scrollLeft < maxScroll - 2) ? 'auto' : 'none';
      }
    }
  }

  itemsPerCollection = computed(() => {
    const all = this.availableFavoritesItems();
    const customCols = this.collections();
    const map = new Map<number | 'all', any[]>();

    // Create Sets for O(1) lookup instead of O(N) array includes
    const customColSets = customCols.map(c => new Set(c.items));
    const allCustomItems = new Set<string>();
    for (const s of customColSets) {
      s.forEach(id => allCustomItems.add(id));
    }

    map.set('all', all.filter(item => {
      if (!item.id) return true;
      return !allCustomItems.has(item.id as string);
    }).slice(0, 100)); // Limit to max 100 items for performance

    for (let i = 0; i < customCols.length; i++) {
      const col = customCols[i];
      const colSet = customColSets[i];
      map.set(col.id, all.filter(item => item.id && colSet.has(item.id as string)).slice(0, 100));
    }
    return map;
  });

  isCollectionEmpty(collectionId: number | 'all'): boolean {
    const items = this.itemsPerCollection().get(collectionId);
    return !items || items.length === 0;
  }

  // NOTE: historyHeroLabel is kept for the Playback/History section
  get historyHeroLabel(): string {
    const id = this.preferencesService.historyHeroMovieId();
    if (!id) return 'Predefinito (Ultimo film visto)';
    return this.availableHistoryItems().find(m => m.media_id === id)?.title || 'Sconosciuto';
  }

  selectHistoryHero(id: number | null) {
    this.preferencesService.setHistoryHeroMovieId(id);
    this.isHistoryDropdownOpen.set(false);
  }

  // --- RIPRODUZIONE E TRAILER ---
  get trailerAutoplay() { return this.preferencesService.trailerAutoplay(); }
  set trailerAutoplay(v: boolean) { this.preferencesService.trailerAutoplay.set(v); this.preferencesService.savePreferences(); }

  get trailerMute() { return this.preferencesService.trailerMute(); }
  set trailerMute(v: boolean) { this.preferencesService.trailerMute.set(v); this.preferencesService.savePreferences(); }

  get trailerCaptions() { return this.preferencesService.trailerCaptions(); }
  set trailerCaptions(v: boolean) { this.preferencesService.trailerCaptions.set(v); this.preferencesService.savePreferences(); }

  get trailerControls() { return this.preferencesService.trailerControls(); }
  set trailerControls(v: boolean) { this.preferencesService.trailerControls.set(v); this.preferencesService.savePreferences(); }

  isTrailerLanguageDropdownOpen = signal(false);
  get trailerCaptionLang() { return this.preferencesService.trailerCaptionLang(); }
  get trailerCaptionLangLabel() {
    return this.languageOptions.find(o => o.value === this.trailerCaptionLang)?.label || 'Italiano';
  }
  setTrailerCaptionLang(val: string) {
    this.preferencesService.trailerCaptionLang.set(val);
    this.preferencesService.savePreferences();
    this.isTrailerLanguageDropdownOpen.set(false);
  }

  get appLanguage() { return this.preferencesService.appLanguage(); }
  get languageLabel() {
    return this.languageOptions.find(o => o.value === this.appLanguage)?.label || 'Italiano';
  }
  setLanguage(val: string) {
    this.preferencesService.appLanguage.set(val);
    this.preferencesService.savePreferences();
    this.isLanguageDropdownOpen.set(false);
  }

  get defaultSeriesLanguage() { return this.preferencesService.defaultSeriesLanguage(); }
  get defaultSeriesLanguageLabel() {
    return this.languageOptions.find(o => o.value === this.defaultSeriesLanguage)?.label || 'Italiano';
  }
  setDefaultSeriesLanguage(val: string) {
    this.preferencesService.defaultSeriesLanguage.set(val);
    this.preferencesService.savePreferences();
    this.isSeriesLanguageDropdownOpen.set(false);
  }

  get defaultFilmLanguage() { return this.preferencesService.defaultFilmLanguage(); }
  get defaultFilmLanguageLabel() {
    return this.languageOptions.find(o => o.value === this.defaultFilmLanguage)?.label || 'Italiano';
  }
  setDefaultFilmLanguage(val: string) {
    this.preferencesService.defaultFilmLanguage.set(val);
    this.preferencesService.savePreferences();
    this.isFilmLanguageDropdownOpen.set(false);
  }

  // --- PROFILES ---
  // Managed by Auth Service mostly. We can mock for UI.
  profilesSignal = signal([
    {
      id: 1,
      name: 'Luca',
      email: 'luca@example.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      isKids: false
    },
    {
      id: 2,
      name: 'Bambini',
      email: 'kids@example.com',
      avatar: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=150&auto=format&fit=crop&q=80',
      isKids: true
    }
  ]);

  get profiles() {
    return this.profilesSignal();
  }

  get currentProfile() {
    return this.authService.selectedProfile();
  }

  // --- CURRENT PROFILE EDIT ---
  profileNameInput = signal(this.currentProfile?.name || '');
  profileAvatarInput = signal(this.currentProfile?.avatar || '');
  isSavingProfile = signal(false);
  saveSuccess = signal(false);

  @ViewChild('profileFileInput') profileFileInput?: ElementRef<HTMLInputElement>;

  private autoSaveTimer: any = null;

  availableAvatars = [
    'assets/avatar/avatar1.jpg',
    'assets/avatar/avatar2.jpg',
    'assets/avatar/avatar3.jpg',
    'assets/avatar/avatar4.jpg',
    'assets/avatar/avatar5.jpg',
    'assets/avatar/avatar6.jpg',
    'assets/avatar/avatar7.jpg',
    'assets/avatar/avatar8.jpg',
    'assets/avatar/avatar9.jpg'
  ];

  private scheduleAutoSave() {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => this.saveCurrentProfile(), 800);
  }

  selectAvatar(avatar: string) {
    this.profileAvatarInput.set(avatar);
    this.scheduleAutoSave();
  }

  onNameChange(name: string) {
    this.profileNameInput.set(name);
    this.scheduleAutoSave();
  }

  triggerProfileFileUpload() {
    this.profileFileInput?.nativeElement.click();
  }

  onProfileFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 200;
          const size = Math.min(img.width, img.height);
          const startX = (img.width - size) / 2;
          const startY = (img.height - size) / 2;
          canvas.width = MAX_SIZE;
          canvas.height = MAX_SIZE;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, startX, startY, size, size, 0, 0, MAX_SIZE, MAX_SIZE);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            this.profileAvatarInput.set(compressed);
            this.scheduleAutoSave();
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async saveCurrentProfile() {
    if (!this.currentProfile) return;
    const newName = this.profileNameInput().trim();
    if (!newName) return;
    this.isSavingProfile.set(true);
    try {
      await this.authService.updateProfile(this.currentProfile.id, newName, this.profileAvatarInput());
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 2000);
    } finally {
      this.isSavingProfile.set(false);
    }
  }



  async deleteAccount() {
    this.isDeletingAccount.set(true);
    try {
      await this.authService.deleteAccount();
    } catch (e) {
      console.error('Errore durante l\'eliminazione dell\'account:', e);
    } finally {
      this.isDeletingAccount.set(false);
      this.closeDeleteModal();
    }
  }

  closeDeleteModal() {
    this.isClosingModal.set(true);
    setTimeout(() => {
      this.isDeleteAccountModalOpen.set(false);
      this.isClosingModal.set(false);
    }, 300);
  }

  // --- ACCOUNT STATS ---
  accountStats = computed(() => {
    const historyItems = this.historyService.items();
    const favItems = this.favoritesService.items();

    const formatTime = (seconds: number) => {
      if (!seconds) return '0m';
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const categorize = (item: any) => {
      const isAnime = item.genres?.some((g: string) => g.toLowerCase().includes('anime'));
      const isAnim = item.genres?.some((g: string) => g.toLowerCase().includes('animazione') || g.toLowerCase().includes('animation'));

      if (isAnime) return 'anime';
      if (isAnim) return 'animazione';
      if (item.media_type === 'movie') return 'film';
      if (item.media_type === 'tv') return 'serie';
      return 'altro';
    };

    type StatCategory = 'film' | 'serie' | 'animazione' | 'anime' | 'altro';

    const stats: Record<StatCategory, { time: number, favs: number }> = {
      film: { time: 0, favs: 0 },
      serie: { time: 0, favs: 0 },
      animazione: { time: 0, favs: 0 },
      anime: { time: 0, favs: 0 },
      altro: { time: 0, favs: 0 }
    };

    let totalTime = 0;
    historyItems.forEach(item => {
      totalTime += (item.progress_seconds || 0);
      const cat = categorize(item) as StatCategory;
      if (stats[cat]) stats[cat].time += (item.progress_seconds || 0);
    });

    favItems.forEach(item => {
      const cat = categorize(item) as StatCategory;
      if (stats[cat]) stats[cat].favs += 1;
    });

    return {
      totalWatched: historyItems.length,
      totalTimeLabel: formatTime(totalTime),
      film: { timeLabel: formatTime(stats.film.time), favs: stats.film.favs },
      serie: { timeLabel: formatTime(stats.serie.time), favs: stats.serie.favs },
      animazione: { timeLabel: formatTime(stats.animazione.time), favs: stats.animazione.favs },
      anime: { timeLabel: formatTime(stats.anime.time), favs: stats.anime.favs },
    };
  });

  // --- PROFILE STATS ---
  profileStats = computed(() => {
    const historyItems = this.historyService.items();
    const favItems = this.favoritesService.items();

    const totalSeconds = historyItems.reduce((acc, i) => acc + (i.progress_seconds || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const timeLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    const movies = historyItems.filter(i => i.media_type === 'movie').length;
    const series = historyItems.filter(i => i.media_type === 'tv').length;
    const favorites = favItems.length;

    return { timeLabel, movies, series, favorites };
  });
}
