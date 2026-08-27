import { Component, signal, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MobileNotification {
  id: number;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  icon: string;
}

@Component({
  selector: 'app-notifications-mobile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-mobile.html',
  styleUrl: './notifications-mobile.scss',
})
export class NotificationsMobile {
  @Input() isOpen = false;
  @Output() closeEvent = new EventEmitter<void>();

  notifications: MobileNotification[] = [
    {
      id: 1,
      title: 'Nuovo Episodio Disponibile',
      message: 'L\'episodio 3 della stagione 2 di "The Bear" è ora disponibile.',
      time: '2 ore fa',
      unread: true,
      icon: 'play'
    },
    {
      id: 2,
      title: 'Consigliato per te',
      message: 'Perché hai guardato "Arcane", ti consigliamo "Cyberpunk: Edgerunners".',
      time: 'Ieri',
      unread: true,
      icon: 'star'
    },
    {
      id: 3,
      title: 'Avviso di Scadenza',
      message: '"Friends" lascerà il catalogo tra 7 giorni. Guardalo finché sei in tempo!',
      time: '3 giorni fa',
      unread: true,
      icon: 'alert'
    },
    {
      id: 4,
      title: 'Nuova Serie in Arrivo',
      message: 'Il trailer ufficiale di "Fallout" è stato rilasciato. Non perdertelo!',
      time: '4 giorni fa',
      unread: false,
      icon: 'calendar'
    },
    {
      id: 5,
      title: 'Playlist Aggiornata',
      message: 'La tua playlist "Da vedere con gli amici" è stata aggiornata con 3 nuovi titoli.',
      time: '5 giorni fa',
      unread: false,
      icon: 'list'
    },
    {
      id: 6,
      title: 'Stagione 4 Disponibile',
      message: 'Tutta la stagione 4 di "Stranger Things" è ora disponibile in streaming.',
      time: '6 giorni fa',
      unread: false,
      icon: 'play'
    },
    {
      id: 7,
      title: 'Nuovo Film Consigliato',
      message: 'Basato sui tuoi gusti: "Dune: Parte 2" potrebbe piacerti molto.',
      time: '1 settimana fa',
      unread: false,
      icon: 'star'
    },
    {
      id: 8,
      title: 'Scadenza Imminente',
      message: '"Blade Runner 2049" uscirà dal catalogo domani sera.',
      time: '1 settimana fa',
      unread: false,
      icon: 'alert'
    },
    {
      id: 9,
      title: 'Evento Speciale',
      message: 'La premiere mondiale di "The Witcher" stagione 4 è fissata per il 12 settembre.',
      time: '10 giorni fa',
      unread: false,
      icon: 'calendar'
    },
    {
      id: 10,
      title: 'Lista Aggiornata',
      message: 'Hai raggiunto 50 titoli nella tua lista "Da vedere". Ottimo progresso!',
      time: '12 giorni fa',
      unread: false,
      icon: 'list'
    },
    {
      id: 11,
      title: 'Episodio Finale',
      message: '"The Last of Us" stagione 2 si conclude questa settimana con l\'episodio 7.',
      time: '2 settimane fa',
      unread: false,
      icon: 'play'
    },
    {
      id: 12,
      title: 'Nuovi Arrivi questa Settimana',
      message: '15 nuovi film e serie sono stati aggiunti al catalogo. Scopri le novità!',
      time: '3 settimane fa',
      unread: false,
      icon: 'star'
    }
  ];

  get hasUnread(): boolean {
    return this.notifications.some(n => n.unread);
  }

  markAllAsRead() {
    this.notifications = this.notifications.map(n => ({ ...n, unread: false }));
  }

  markAsRead(id: number) {
    this.notifications = this.notifications.map(n =>
      n.id === id ? { ...n, unread: false } : n
    );
  }

  close() {
    this.closeEvent.emit();
  }
}
