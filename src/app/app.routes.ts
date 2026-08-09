import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { MovieDetailComponent } from './components/movie-detail/movie-detail';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'movie/:id', component: MovieDetailComponent }
];
