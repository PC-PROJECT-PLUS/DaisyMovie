import { Injectable, signal } from '@angular/core';

export interface ModalMediaItem {
  id: number;
  title: string;
  posterUrl: string;
  backdropUrl: string;
  year?: string;
  isSeries: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CollectionsModalService {
  public readonly isOpen = signal<boolean>(false);
  public readonly mediaItem = signal<ModalMediaItem | null>(null);

  openModal(item: ModalMediaItem) {
    this.mediaItem.set(item);
    this.isOpen.set(true);
  }

  closeModal() {
    this.isOpen.set(false);
    setTimeout(() => {
      this.mediaItem.set(null);
    }, 300); // Wait for closing animation
  }
}
