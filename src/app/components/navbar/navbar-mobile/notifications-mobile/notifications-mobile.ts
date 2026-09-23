import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../../../services/notification.service';

@Component({
  selector: 'app-notifications-mobile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notifications-mobile.html',
  styleUrl: './notifications-mobile.scss',
})
export class NotificationsMobile {
  @Input() isOpen = false;
  @Output() closeEvent = new EventEmitter<void>();

  notificationService = inject(NotificationService);
  private router = inject(Router);

  // Computed: get notifications from real service
  notifications = computed(() => this.notificationService.notifications());

  // Computed: count of unread
  unreadCount = computed(() => this.notifications().filter(n => n.unread).length);
  hasUnread = computed(() => this.unreadCount() > 0);

  // Relative timestamp from ISO string
  relativeTime(isoString: string): string {
    if (!isoString || isoString === 'Poco fa') return isoString || 'Poco fa';

    const now = new Date();
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString; // fallback for already formatted strings

    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMin < 1) return 'Adesso';
    if (diffMin < 60) return `${diffMin} min fa`;
    if (diffHrs < 24) return `${diffHrs} ${diffHrs === 1 ? 'ora' : 'ore'} fa`;
    if (diffDays === 1) return 'Ieri';
    if (diffDays < 7) return `${diffDays} giorni fa`;
    if (diffWeeks === 1) return '1 settimana fa';
    return `${diffWeeks} settimane fa`;
  }

  close() {
    this.closeEvent.emit();
  }

  async markAsRead(id: string) {
    await this.notificationService.markAsRead(id);
  }

  async markAsReadAndNavigate(notif: any) {
    await this.notificationService.markAsRead(notif.id);
    if (notif.targetUrl && notif.targetUrl !== '/') {
      this.close();
      this.router.navigateByUrl(notif.targetUrl);
    }
  }

  async markAllAsRead() {
    await this.notificationService.markAllAsRead();
  }
}
