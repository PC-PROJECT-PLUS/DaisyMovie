import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Public auth routes
  {
    path: 'auth',
    loadComponent: () => import('./components/auth/auth').then(m => m.AuthComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./components/profile-select/profile-select').then(m => m.ProfileSelectComponent)
  },

  // Protected app routes — lazy loaded
  {
    path: '',
    loadComponent: () => import('./components/home/home').then(m => m.Home),
    canActivate: [authGuard]
  },
  {
    path: 'movie/:id',
    loadComponent: () => import('./components/movie-detail/movie-detail').then(m => m.MovieDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'series/:id',
    loadComponent: () => import('./components/series-detail/series-detail').then(m => m.SeriesDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./components/settings/settings').then(m => m.Settings),
    canActivate: [authGuard]
  },
  {
    path: 'favorites',
    loadComponent: () => import('./components/favorites/favorites').then(m => m.Favorites),
    canActivate: [authGuard]
  },
  {
    path: 'history',
    loadComponent: () => import('./components/history/history').then(m => m.HistoryComponent),
    canActivate: [authGuard]
  },
  {
    path: 'search',
    loadComponent: () => import('./components/search/search').then(m => m.SearchComponent),
    canActivate: [authGuard]
  },
];
