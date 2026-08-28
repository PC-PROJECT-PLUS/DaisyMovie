import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
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
  private titleService = inject(Title);

  view = signal<AuthView>('landing');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  isLoading = signal(false);
  errorMsg = signal('');
  pageVisible = signal(false);

  constructor() {
    this.titleService.setTitle('DaisyMovie');
    // Trigger entrance animation
    setTimeout(() => this.pageVisible.set(true), 20);
  }

  openView(v: 'login' | 'register') {
    this.errorMsg.set('');
    this.email.set('');
    this.password.set('');
    this.confirmPassword.set('');
    this.view.set(v);
    this.titleService.setTitle(v === 'login' ? 'DaisyMovie - Login' : 'DaisyMovie - Register');
  }

  backToLanding() {
    this.view.set('landing');
    this.titleService.setTitle('DaisyMovie');
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
