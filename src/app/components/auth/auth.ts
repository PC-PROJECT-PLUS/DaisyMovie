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

  get mobilePosterCols() { return this.desktopPosterCols.slice(0, 6); }

  constructor() {
    this.titleService.setTitle('DaisyMovie');
    // Trigger entrance animation
    setTimeout(() => this.pageVisible.set(true), 20);
  }

  private googleClient: any;

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Check if google is available (script loaded)
      const initGoogle = () => {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
          this.googleClient = google.accounts.oauth2.initCodeClient({
            client_id: environment.googleClientId,
            scope: 'email profile openid',
            ux_mode: 'popup',
            callback: async (response: any) => {
              if (response.code) {
                this.isLoading.set(true);
                try {
                  await this.authService.loginWithGoogleCode(response.code);
                } catch (err: any) {
                  this.errorMsg.set('Errore durante il login con Google');
                } finally {
                  this.isLoading.set(false);
                }
              }
            }
          });
        }
      };

      if (typeof google !== 'undefined') {
        initGoogle();
      } else {
        // Fallback if the script takes slightly longer to load
        window.addEventListener('load', initGoogle);
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

  openView(v: 'login' | 'register' | 'verify') {
    this.errorMsg.set('');
    this.successMsg.set('');
    this.email.set('');
    this.password.set('');
    this.confirmPassword.set('');
    this.verifyCode.set('');
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

  async submit() {
    const e = this.email().trim();
    const p = this.password();
    if (!e || !p) { this.errorMsg.set('Compila tutti i campi.'); return; }
    if (this.view() === 'register' && p !== this.confirmPassword()) {
      this.errorMsg.set('Le password non coincidono.'); return;
    }
    this.errorMsg.set('');
    this.successMsg.set('');
    this.isLoading.set(true);
    try {
      if (this.view() === 'login') {
        await this.authService.login(e, p);
        this.router.navigate(['/profile']);
      } else if (this.view() === 'register') {
        await this.authService.register(e, p);
        // Do not route to profiles yet, ask for code!
        this.view.set('verify');
        this.successMsg.set('Codice inviato. Controlla la tua email.');
        this.startResendCountdown();
      }
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
        this.googleClient.requestCode();
      } else {
        this.errorMsg.set('Servizio di login Google non pronto.');
      }
    } else {
      this.errorMsg.set('Provider non supportato.');
    }
  }

  isLanding() { return this.view() === 'landing'; }
  isLogin() { return this.view() === 'login'; }
  isRegister() { return this.view() === 'register'; }
}
