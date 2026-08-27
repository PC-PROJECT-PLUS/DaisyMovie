import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type AuthView = 'landing' | 'login' | 'register';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class AuthComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  view = signal<AuthView>('landing');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  isLoading = signal(false);
  errorMsg = signal('');
  pageVisible = signal(false);

  constructor() {
    // Trigger entrance animation
    setTimeout(() => this.pageVisible.set(true), 20);
  }

  openView(v: 'login' | 'register') {
    this.errorMsg.set('');
    this.email.set('');
    this.password.set('');
    this.confirmPassword.set('');
    // Animate out then switch
    this.pageVisible.set(false);
    setTimeout(() => {
      this.view.set(v);
      this.pageVisible.set(true);
    }, 280);
  }

  backToLanding() {
    this.pageVisible.set(false);
    setTimeout(() => {
      this.view.set('landing');
      this.pageVisible.set(true);
    }, 280);
  }

  async submit() {
    const e = this.email().trim();
    const p = this.password();
    if (!e || !p) { this.errorMsg.set('Compila tutti i campi.'); return; }
    if (this.view() === 'register' && p !== this.confirmPassword()) {
      this.errorMsg.set('Le password non coincidono.'); return;
    }
    this.errorMsg.set('');
    this.isLoading.set(true);
    try {
      if (this.view() === 'login') {
        await this.authService.login(e, p);
      } else {
        await this.authService.register(e, p);
      }
      this.pageVisible.set(false);
      setTimeout(() => this.router.navigate(['/profile']), 300);
    } catch {
      this.errorMsg.set('Qualcosa è andato storto. Riprova.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loginWithProvider(provider: 'google' | 'apple') {
    this.isLoading.set(true);
    await this.authService.loginWithProvider(provider);
    this.isLoading.set(false);
    this.pageVisible.set(false);
    setTimeout(() => this.router.navigate(['/profile']), 300);
  }

  isLanding() { return this.view() === 'landing'; }
  isLogin() { return this.view() === 'login'; }
  isRegister() { return this.view() === 'register'; }
}
