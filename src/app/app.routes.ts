import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { MovieDetailComponent } from './components/movie-detail/movie-detail';
import { SeriesDetailComponent } from './components/series-detail/series-detail';
import { Settings } from './components/settings/settings';
import { Favorites } from './components/favorites/favorites';
import { HistoryComponent } from './components/history/history';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'movie/:id', component: MovieDetailComponent },
  { path: 'series/:id', component: SeriesDetailComponent },
  { path: 'settings', component: Settings },
  { path: 'favorites', component: Favorites },
  { path: 'history', component: HistoryComponent }
];
