import { Component, signal, inject, PLATFORM_ID, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

declare var google: any;

type AuthView = 'landing' | 'login' | 'register' | 'verify';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.scss'
})
export class AuthComponent implements OnInit, AfterViewInit, OnDestroy {
  private router = inject(Router);
  private titleService = inject(Title);
  public authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  view = signal<AuthView>('landing');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  verifyCode = signal('');
  isLoading = signal(false);
  errorMsg = signal('');
  successMsg = signal('');
  pageVisible = signal(false);
  passwordVisible = signal(false);
  resendCountdown = signal(0);
  private resendInterval: any;
  private rafIds: number[] = [];

  readonly BASE_POSTER_URL = 'https://image.tmdb.org/t/p/w342/';

  readonly desktopPosterCols: string[][] = [
    ['bjiS5ipwxb9JFy3XRRN4OAilSeX.jpg','vhv7lBWYM0DUuNU2a0V7Rhq21dD.jpg','5rhTDKUhPYvpdQIijFIs5VoWsON.jpg','pu2VxGlpGwffOx292w18b1tv96j.jpg','tN799oUR0f1gUKDYdMNrDaY7I51.jpg','gaet1xQ2nxrG0V1Ep9T20ZMNEIC.jpg','hVXjX1jLZ1ljFSNGXpjJfbTUOa7.jpg','uxCaBoYXsDC4A0SqTm3SISj0OwK.jpg','6rpvddXbaQPOi0fB2HKWbZ3uUSg.jpg'],
    ['16oqRrWVzQm6qdGfBxvziZ2UiMT.jpg','eSS5mvSG84UUuvtbHel5Yu3Wik4.jpg','zxcMdx0w5Zmg8yZuuiS7CJ8vOea.jpg','bRwnj8WEKBCvmfeUNOukJPwB43K.jpg','3r0O6BW9USoZ9mteCVyNKMQriRL.jpg','sfQtVlIHljToOwYjhe21KPGzZWK.jpg','3PWJqDfygN0YNNjWsDUOXclCp3h.jpg','alpf5v4UqSFawPmG9RX03Or4BDk.jpg','oLld47ZT1I3iecM3OWhIphohQUJ.jpg'],
    ['4LwvU9SZc8QQzW1X1FAPhNbXnEU.jpg','7bOuu1SRALGwsG2fLCTvRkCmQBj.jpg','360qdtu2hLnqMu8SVHMywn420w1.jpg','eUJXk3bTvLBi5Zcb0BCedZU7lVL.jpg','sk5DjLp7x9cmi0V1423YJmIVJbC.jpg','AnJ8IQJI23hNpYXVNaythu061Ru.jpg','6UqflU8Qqkz7Dq4swJPqs0ZJjY4.jpg','yihdXomYb5kTeSivtFndMy5iDmf.jpg','rsHEVjzxU8cxz1sm3vboj99daNv.jpg'],
    ['3sgnSfNT27Bx5O5ukr7B26mhEQq.jpg','rhGx6E3qRNMgj3i5su2oukNHwIQ.jpg','uwMKWjcNID0D9jjplsjkQS2OrB4.jpg','fYXqpgPmHMphSF2W30GbTeJVIa5.jpg','9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg','oiIPU4lvnI0Ag2K9cyAi44eCaoE.jpg','yvirUYrva23IudARHn3mMGVxWqM.jpg','9fbZdiOI9fRinl44mNm3CYgEtYR.jpg','46q8z1TbbVcF8uhRHsvt5s0h2SH.jpg'],
    ['znHT8peERZRWG1ME3r0Db0EV8k8.jpg','ZWHxL2ETItcZzeVsVfs6gv3SZ7.jpg','ogwQOLbCfncjvBhFb5l0OmQH8KC.jpg','1g0dhYtq4irTY1GPXvft6k4YLjm.jpg','fgSm5ylwiXbIHn8UbUXDjk9RRu4.jpg','kONbgktPKsm3EMj3MiES0IP8BRr.jpg','uhzRnTW4DM13UQBvZP3eVNzQTuz.jpg','6uiz2xx61qhGv3ZcZg0n5tgahY3.jpg','13MmRwmG5NmaMfU8qNrtgGXisiD.jpg'],
    ['cHKo3m8N1fwvEy2ZEr0xGmmMODV.jpg','1lskMEArKsp7pzQck90q6ttXAbn.jpg','fWVSwgjpT2D78VUh6X8UBd2rorW.jpg','oJ7g2CifqpStmoYQyaLQgEU32qO.jpg','59o7OyB8J37GwOAod9mhgJjhgH2.jpg','bRBeSHfGHwkEpImlhxPmOcUsaeg.jpg','yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg','h39KOfADZB5I7JzNh9ih9GbZdoK.jpg','eJGWx219ZcEMVQJhAgMiqo8tYY.jpg'],
    ['7AEBdyGYXumXWmMFeynE8227KeZ.jpg','7WsyChQLEftFiDOVTGkv3hFpyyt.jpg','aF3IhwS1mrVfvM9OMXmTaXAT0l8.jpg','RYMX2wcKCBAr24UyPD7xwmjaTn.jpg','3bhkrj58Vtu7enYsRolD1fZdja1.jpg','ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg','bjiS5ipwxb9JFy3XRRN4OAilSeX.jpg','eSS5mvSG84UUuvtbHel5Yu3Wik4.jpg','zxcMdx0w5Zmg8yZuuiS7CJ8vOea.jpg'],
    ['360qdtu2hLnqMu8SVHMywn420w1.jpg','9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg','fgSm5ylwiXbIHn8UbUXDjk9RRu4.jpg','kONbgktPKsm3EMj3MiES0IP8BRr.jpg','oiIPU4lvnI0Ag2K9cyAi44eCaoE.jpg','rsHEVjzxU8cxz1sm3vboj99daNv.jpg','7AEBdyGYXumXWmMFeynE8227KeZ.jpg','1g0dhYtq4irTY1GPXvft6k4YLjm.jpg','pu2VxGlpGwffOx292w18b1tv96j.jpg'],
    ['ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg','bRwnj8WEKBCvmfeUNOukJPwB43K.jpg','tN799oUR0f1gUKDYdMNrDaY7I51.jpg','eUJXk3bTvLBi5Zcb0BCedZU7lVL.jpg','cHKo3m8N1fwvEy2ZEr0xGmmMODV.jpg','6rpvddXbaQPOi0fB2HKWbZ3uUSg.jpg','16oqRrWVzQm6qdGfBxvziZ2UiMT.jpg','3r0O6BW9USoZ9mteCVyNKMQriRL.jpg','yihdXomYb5kTeSivtFndMy5iDmf.jpg'],
    ['4LwvU9SZc8QQzW1X1FAPhNbXnEU.jpg','AnJ8IQJI23hNpYXVNaythu061Ru.jpg','59o7OyB8J37GwOAod9mhgJjhgH2.jpg','alpf5v4UqSFawPmG9RX03Or4BDk.jpg','uhzRnTW4DM13UQBvZP3eVNzQTuz.jpg','hVXjX1jLZ1ljFSNGXpjJfbTUOa7.jpg','fWVSwgjpT2D78VUh6X8UBd2rorW.jpg','sk5DjLp7x9cmi0V1423YJmIVJbC.jpg','7bOuu1SRALGwsG2fLCTvRkCmQBj.jpg'],
  ];

  get mobilePosterCols() { return this.desktopPosterCols; }

  constructor() {
    this.titleService.setTitle('DaisyMovie');
    // Trigger entrance animation
    setTimeout(() => this.pageVisible.set(true), 20);
  }

  private googleClient: any;

  private initGoogleClient() {
    if (typeof google !== 'undefined' && google?.accounts?.oauth2) {
      this.googleClient = google.accounts.oauth2.initCodeClient({
        client_id: environment.googleClientId,
        scope: 'email profile openid',
        ux_mode: 'popup',
        callback: async (response: any) => {
          if (response.error) {
            console.error('Google OAuth error response:', response);
            this.errorMsg.set(`Errore Google: ${response.error_description || response.error}`);
            return;
          }
          if (response.code) {
            this.isLoading.set(true);
            try {
              await this.authService.loginWithGoogleCode(response.code);
            } catch (err: any) {
              console.error('Login backend error:', err);
              this.errorMsg.set(err.error?.error || 'Errore durante il login con Google');
            } finally {
              this.isLoading.set(false);
            }
          }
        },
        error_callback: (nonOAuthErr: any) => {
          console.error('Google Client non-OAuth error:', nonOAuthErr);
          this.errorMsg.set(`Errore popup Google: ${nonOAuthErr.message || nonOAuthErr.type || 'finestra chiusa o bloccata'}`);
        }
      });
    }
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      if (typeof google !== 'undefined') {
        this.initGoogleClient();
      } else {
        window.addEventListener('load', () => this.initGoogleClient());
      }
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Short delay: let Angular finish painting the DOM, then start the scroll
      setTimeout(() => this.startPosterScroll(), 0);
    }
  }

  ngOnDestroy() {
    this.rafIds.forEach(id => cancelAnimationFrame(id));
    clearInterval(this.resendInterval);
  }

  private startPosterScroll() {
    const speeds = [0.38, 0.41, 0.36, 0.40, 0.37, 0.42, 0.39, 0.41, 0.35, 0.40];

    // Query all poster columns across all grids (desktop + mobile)
    const allCols = document.querySelectorAll<HTMLElement>('.mob-poster-col');
    let colIndex = 0;

    allCols.forEach(col => {
      const speed = speeds[colIndex % speeds.length];
      let y = (colIndex * 41); // stagger start per column
      colIndex++;

      const tick = () => {
        // Calculate exact height of 9 cards to avoid DOM reads/thrashing
        const isDesktop = window.innerWidth > 600;
        const cardHeight = isDesktop ? 210 : 150;
        const gap = 12;
        const halfH = (cardHeight + gap) * 9;

        y += speed;
        if (y >= halfH) y -= halfH;
        col.style.transform = `translateY(-${y}px)`;

        this.rafIds.push(requestAnimationFrame(tick));
      };
      this.rafIds.push(requestAnimationFrame(tick));
    });
  }

  togglePassword() {
    this.passwordVisible.update(v => !v);
  }

  loginStep = signal<'email' | 'password' | 'set-password'>('email');

  openView(v: 'login' | 'register' | 'verify') {
    this.errorMsg.set('');
    this.successMsg.set('');
    this.email.set('');
    this.password.set('');
    this.confirmPassword.set('');
    this.verifyCode.set('');
    this.loginStep.set('email');
    this.view.set(v);
    this.titleService.setTitle(v === 'login' ? 'DaisyMovie - Login' : (v === 'register' ? 'DaisyMovie - Register' : 'DaisyMovie - Verifica'));
  }

  backToLanding() {
    this.view.set('landing');
    this.titleService.setTitle('DaisyMovie');
  }

  startResendCountdown() {
    this.resendCountdown.set(60);
    clearInterval(this.resendInterval);
    this.resendInterval = setInterval(() => {
      const current = this.resendCountdown();
      if (current > 0) {
        this.resendCountdown.set(current - 1);
      } else {
        clearInterval(this.resendInterval);
      }
    }, 1000);
  }

  async resendCode() {
    if (this.resendCountdown() > 0 || !this.email()) return;
    this.errorMsg.set('');
    this.successMsg.set('');
    this.isLoading.set(true);
    try {
      // Re-trigger register which updates the verification code
      await this.authService.register(this.email().trim(), this.password() || 'placeholder');
      this.successMsg.set('Nuovo codice inviato con successo.');
      this.startResendCountdown();
    } catch (err: any) {
      this.errorMsg.set(err.error?.error || 'Errore durante il reinvio del codice.');
    } finally {
      this.isLoading.set(false);
    }
  }

  validatePassword(password: string): string | null {
    if (password.length < 8) return 'La password deve contenere almeno 8 caratteri.';
    if (!/[A-Z]/.test(password)) return 'La password deve contenere almeno una lettera maiuscola.';
    if (!/[a-z]/.test(password)) return 'La password deve contenere almeno una lettera minuscola.';
    if (!/[0-9]/.test(password)) return 'La password deve contenere almeno un numero.';
    if (!/[@$!%*?&]/.test(password)) return 'La password deve contenere almeno un carattere speciale (@$!%*?&).';
    return null;
  }

  async submitEmail() {
    const e = this.email().trim();
    if (!e) { this.errorMsg.set('Inserisci la tua email.'); return; }
    
    this.errorMsg.set('');
    this.isLoading.set(true);
    try {
      const res = await this.authService.checkEmail(e);
      if (!res.exists) {
        this.errorMsg.set('Nessun account trovato con questa email.');
      } else {
        if (res.hasPassword) {
          this.loginStep.set('password');
        } else {
          this.loginStep.set('set-password');
        }
      }
    } catch (err: any) {
      console.error('submitEmail error:', err);
      this.errorMsg.set(err.error?.error || (err.message ? `Errore di rete: ${err.status || ''} ${err.message}` : 'Si è verificato un errore di connessione.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  async submitPassword() {
    const e = this.email().trim();
    const p = this.password();
    if (!p) { this.errorMsg.set('Inserisci la password.'); return; }
    
    this.errorMsg.set('');
    this.isLoading.set(true);
    try {
      await this.authService.login(e, p);
      this.router.navigate(['/profile']);
    } catch (err: any) {
      this.errorMsg.set(err.error?.error || 'Password errata.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async submitSetPassword() {
    const e = this.email().trim();
    const p = this.password();
    const cp = this.confirmPassword();
    
    if (!p || !cp) { this.errorMsg.set('Compila tutti i campi.'); return; }
    if (p !== cp) { this.errorMsg.set('Le password non coincidono.'); return; }
    
    const pwdError = this.validatePassword(p);
    if (pwdError) { this.errorMsg.set(pwdError); return; }

    this.errorMsg.set('');
    this.isLoading.set(true);
    try {
      await this.authService.setPassword(e, p);
      this.router.navigate(['/profile']);
    } catch (err: any) {
      this.errorMsg.set(err.error?.error || 'Errore durante l\'impostazione della password.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async submitRegister() {
    const e = this.email().trim();
    const p = this.password();
    const cp = this.confirmPassword();

    if (!e || !p || !cp) { this.errorMsg.set('Compila tutti i campi.'); return; }
    if (p !== cp) { this.errorMsg.set('Le password non coincidono.'); return; }
    
    const pwdError = this.validatePassword(p);
    if (pwdError) { this.errorMsg.set(pwdError); return; }

    this.errorMsg.set('');
    this.successMsg.set('');
    this.isLoading.set(true);
    try {
      await this.authService.register(e, p);
      this.view.set('verify');
      this.successMsg.set('Codice inviato. Controlla la tua email.');
      this.startResendCountdown();
    } catch (err: any) {
      this.errorMsg.set(err.error?.error || 'Si è verificato un errore.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async submitVerify() {
    const e = this.email().trim();
    const c = this.verifyCode().trim();
    if (!e || !c) { this.errorMsg.set('Compila tutti i campi.'); return; }
    
    this.errorMsg.set('');
    this.successMsg.set('');
    this.isLoading.set(true);
    try {
      await this.authService.verify(e, c);
      clearInterval(this.resendInterval);
      this.router.navigate(['/profile']);
    } catch (err: any) {
      this.errorMsg.set(err.error?.error || 'Codice errato o scaduto.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loginWithProvider(provider: 'google' | 'apple') {
    if (provider === 'google') {
      if (this.googleClient) {
        this.errorMsg.set('');
        this.googleClient.requestCode();
      } else {
        // Tentativo di inizializzazione on-demand se lo script era in ritardo
        if (typeof google !== 'undefined' && google?.accounts?.oauth2) {
          this.initGoogleClient();
          if (this.googleClient) {
            this.errorMsg.set('');
            this.googleClient.requestCode();
            return;
          }
        }
        this.errorMsg.set('Servizio di login Google non pronto. Ricarica la pagina.');
      }
    } else {
      this.errorMsg.set('Provider non supportato.');
    }
  }

  isLanding() { return this.view() === 'landing'; }
  isLogin() { return this.view() === 'login'; }
  isRegister() { return this.view() === 'register'; }
}
