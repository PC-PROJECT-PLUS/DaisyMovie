import { Component, signal, inject, computed } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Navbar } from './components/navbar/navbar';
import { filter } from 'rxjs/operators';

// Routes where the navbar should be hidden
const HIDDEN_NAVBAR_ROUTES = ['/auth', '/profile'];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('DaisyMovie');
  private router = inject(Router);

  showNavbar = signal(true);

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        const url = e.urlAfterRedirects;
        this.showNavbar.set(
          !HIDDEN_NAVBAR_ROUTES.some(r => url.startsWith(r))
        );
      });
  }
}
