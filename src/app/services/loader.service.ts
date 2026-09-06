import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  isPageLoading = signal(false);
  isRouteReady = signal(false);

  startNavigation() {
    this.isPageLoading.set(true);
    this.isRouteReady.set(false);
  }

  setRouteReady() {
    this.isRouteReady.set(true);
  }
}
