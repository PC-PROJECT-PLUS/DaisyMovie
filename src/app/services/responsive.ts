import { Injectable, inject } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ResponsiveService {
  private breakpointObserver = inject(BreakpointObserver);

  // We consider Handset (phones) and small tablets as mobile.
  // The max-width 768px is a common breakpoint for mobile.
  public isMobile = toSignal(
    this.breakpointObserver.observe(['(max-width: 768px)']).pipe(
      map(result => result.matches)
    ),
    { initialValue: false }
  );
}
