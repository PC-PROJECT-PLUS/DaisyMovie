import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformServer } from '@angular/common';
import { AuthService } from '../services/auth.service';

/** Protects all main app routes */
export const authGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (isPlatformServer(platformId)) return true; // bypass on server

  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/auth']);
    return false;
  }
  if (!auth.selectedProfile()) {
    router.navigate(['/profile']);
    return false;
  }
  return true;
};

/** Redirects already-authenticated users */
export const guestGuard: CanActivateFn = (_route, _state) => {
  const platformId = inject(PLATFORM_ID);
  if (isPlatformServer(platformId)) return true; // bypass on server

  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.selectedProfile()) {
    router.navigate(['/']);
    return false;
  }
  if (auth.isLoggedIn() && !auth.selectedProfile() && _state.url === '/auth') {
    router.navigate(['/profile']);
    return false;
  }
  return true;
};
