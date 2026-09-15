import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-logout-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logout-modal.html',
  styleUrl: './logout-modal.scss'
})
export class LogoutModalComponent {
  authService = inject(AuthService);
  router = inject(Router);

  // We use this state to manage the closing animation before destroying the component
  isClosing = signal(false);

  closeModal() {
    this.isClosing.set(true);
    setTimeout(() => {
      this.authService.showLogoutModal.set(false);
      this.isClosing.set(false); // reset for next time
    }, 300); // Wait for CSS animation to finish
  }

  goToProfiles() {
    this.authService.selectedProfile.set(null);
    sessionStorage.removeItem('daisy_profile');
    this.closeModal();
    setTimeout(() => {
      this.router.navigate(['/profile']);
    }, 300);
  }

  changeAccount() {
    this.authService.logout();
    this.closeModal();
    setTimeout(() => {
      this.router.navigate(['/auth']);
    }, 300);
  }
}
