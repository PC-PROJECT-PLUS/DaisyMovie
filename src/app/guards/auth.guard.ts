import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Protects all main app routes — requires login AND profile selected */
export const authGuard: CanActivateFn = () => {
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

/** Redirects already-authenticated users away from /auth and /profile */
export const guestGuard: CanActivateFn = (_route, _state) => {
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
