import { Component, ElementRef, ViewChild, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CollectionsModalService } from '../../services/collections-modal.service';
import { FavoritesService } from '../../services/favorites.service';
import { PreferencesService } from '../../services/preferences.service';

@Component({
  selector: 'app-collections-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './collections-modal.html'
})
export class CollectionsModalComponent {
  @ViewChild('newColInput') newColInput!: ElementRef<HTMLInputElement>;
  
  isCreatingCollection = signal(false);
  newCollectionName = signal('');
  isLoadingModal = signal(false);
  
  // Fully detached optimistic UI state
  localState = signal<Record<string, boolean>>({});
  
  // Track visual toggles to prevent double-click spam on the same checkbox
  private isToggling = new Set<string>();
  
  // Serialize backend operations to prevent race conditions
  private backendQueue = Promise.resolve();

  constructor(
    public collectionsModalService: CollectionsModalService,
    public favoritesService: FavoritesService,
    public preferencesService: PreferencesService
  ) {
    effect(() => {
      if (this.collectionsModalService.isOpen() && this.collectionsModalService.mediaItem()) {
        this.syncLocalState();
      } else {
        this.localState.set({});
        this.isToggling.clear();
      }
    });
  }

  // Sync local state when modal opens or media changes
  syncLocalState() {
    const media = this.collectionsModalService.mediaItem();
    if (!media) return;
    const mediaKey = (media.isSeries ? 'series_' : 'movie_') + media.id;
    
    const newState: Record<string, boolean> = {};
    
    const isBookmarked = this.favoritesService.isBookmarked(media.id, media.isSeries);
    const isHidden = this.preferencesService.isHiddenFromGeneral(mediaKey);
    newState['general'] = isBookmarked && !isHidden;
    
    for (const col of this.favoritesService.collections()) {
      newState[`col_${col.id}`] = this.favoritesService.isMovieInCollection(media.id, col.id, media.isSeries);
    }
    
    this.localState.set(newState);
  }

  isClosingModal = signal(false);

  closeModal() {
    this.isClosingModal.set(true);
    setTimeout(() => {
      this.collectionsModalService.closeModal();
      this.isCreatingCollection.set(false);
      this.newCollectionName.set('');
      this.isClosingModal.set(false);
    }, 300);
  }

  isMovieInCollection(colId: number | null): boolean {
    const key = colId === null ? 'general' : `col_${colId}`;
    return !!this.localState()[key];
  }

  async toggleMovieInCollection(collectionId: number | null) {
    const media = this.collectionsModalService.mediaItem();
    if (!media) return;
    
    const mediaKey = (media.isSeries ? 'series_' : 'movie_') + media.id;
    const key = collectionId === null ? 'general' : `col_${collectionId}`;
    
    // Anti-spam debounce for the SAME collection
    if (this.isToggling.has(key)) return;
    this.isToggling.add(key);

    const wasChecked = !!this.localState()[key];
    const isNowChecked = !wasChecked;

    // Optimistic UI Update Instantly
    this.localState.update(s => {
      const next = { ...s, [key]: isNowChecked };
      
      if (collectionId !== null) {
        if (isNowChecked) {
          // Aggiunta a custom collection -> spunta visivamente anche i preferiti
          next['general'] = true;
        } else {
          // Rimozione da custom collection
          // Se non è in nessun'altra collezione e prima era "nascosto" dai preferiti generali, 
          // togliamo ottimisticamente anche la spunta ai preferiti
          const inAnyOther = Object.keys(next).some(k => k.startsWith('col_') && k !== key && next[k]);
          if (!inAnyOther && this.preferencesService.isHiddenFromGeneral(mediaKey)) {
            next['general'] = false;
          }
        }
      }
      return next;
    });

    // Code that needs to run sequentially
    const backendAction = async () => {
      try {
        if (collectionId === null) {
          if (!isNowChecked) { // wasChecked === true, we are unchecking
            const inAnyCollection = this.favoritesService.collections().some(c => 
              this.favoritesService.isMovieInCollection(media.id, c.id, media.isSeries)
            );
            if (inAnyCollection) {
              // If it's in a custom collection, just hide it from general list
              this.preferencesService.toggleHiddenFromGeneral(mediaKey);
            } else {
              // Completely remove from favorites
              if (this.favoritesService.isBookmarked(media.id, media.isSeries)) {
                await this.favoritesService.toggleFavorite({ ...media }, media.isSeries);
              }
            }
          } else { // wasChecked === false, we are checking
            if (this.preferencesService.isHiddenFromGeneral(mediaKey)) {
              // Was hidden, just unhide it
              this.preferencesService.toggleHiddenFromGeneral(mediaKey);
            } else if (!this.favoritesService.isBookmarked(media.id, media.isSeries)) {
              // Not bookmarked, add it
              await this.favoritesService.toggleFavorite({ ...media }, media.isSeries);
            }
          }
        } else {
          if (!isNowChecked) { // removing from custom collection
            await this.favoritesService.removeMovieFromCollection(media.id, collectionId, media.isSeries);
            
            // Clean up orphan favorites
            const inAnyOtherCollection = this.favoritesService.collections().some(c => 
              this.favoritesService.isMovieInCollection(media.id, c.id, media.isSeries)
            );
            if (!inAnyOtherCollection && this.preferencesService.isHiddenFromGeneral(mediaKey)) {
              if (this.favoritesService.isBookmarked(media.id, media.isSeries)) {
                await this.favoritesService.toggleFavorite({ ...media }, media.isSeries);
              }
              this.preferencesService.toggleHiddenFromGeneral(mediaKey);
              // Optimistic UI already handled the checkbox, but we re-sync just in case
              this.localState.update(s => ({ ...s, 'general': false })); 
            }
          } else { // adding to custom collection
            const wasBookmarked = this.favoritesService.isBookmarked(media.id, media.isSeries);
            await this.favoritesService.addMovieToCollection({ ...media }, collectionId, media.isSeries);
            
            if (!wasBookmarked && !this.preferencesService.isHiddenFromGeneral(mediaKey)) {
              this.preferencesService.toggleHiddenFromGeneral(mediaKey);
            }
          }
        }
      } catch (err) {
        console.error('Error toggling collection:', err);
        // Revert on error
        this.syncLocalState();
      }
    };

    // Serialize operations for the backend, but unlock UI anti-spam quickly
    this.backendQueue = this.backendQueue.then(backendAction).finally(() => {
    });
    
    // We remove the UI lock after a tiny timeout so they can click repeatedly
    setTimeout(() => {
      this.isToggling.delete(key);
    }, 200);
  }

  async saveNewCollection() {
    const name = this.newCollectionName().trim();
    if (!name) return;

    this.isLoadingModal.set(true);
    await this.favoritesService.createCollection(name);
    
    // Automatically add the movie to the newly created collection
    const media = this.collectionsModalService.mediaItem();
    if (media) {
      const newCol = this.favoritesService.collections().find(c => c.name === name);
      if (newCol) {
        const mediaKey = (media.isSeries ? 'series_' : 'movie_') + media.id;
        const wasBookmarked = this.favoritesService.isBookmarked(media.id, media.isSeries);
        await this.favoritesService.addMovieToCollection({ ...media }, newCol.id, media.isSeries);
        
        if (!wasBookmarked && !this.preferencesService.isHiddenFromGeneral(mediaKey)) {
          this.preferencesService.toggleHiddenFromGeneral(mediaKey);
        }
        
        // Optimistically update the UI for the newly created collection
        this.localState.update(s => ({ ...s, [`col_${newCol.id}`]: true, 'general': true }));
      }
    }

    this.newCollectionName.set('');
    this.isCreatingCollection.set(false);
    this.isLoadingModal.set(false);
  }

  focusInput() {
    setTimeout(() => {
      if (this.newColInput) {
        this.newColInput.nativeElement.focus();
      } else {
        const input = document.getElementById('global-new-col-input');
        if (input) input.focus();
      }
    }, 50);
  }
}
