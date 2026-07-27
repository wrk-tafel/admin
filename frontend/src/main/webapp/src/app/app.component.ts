import {Component, effect, inject, signal} from '@angular/core';
import {NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet} from '@angular/router';
import {MatProgressBarModule} from '@angular/material/progress-bar';

import {toSignal} from '@angular/core/rxjs-interop';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'body',
  templateUrl: 'app.component.html',
  imports: [
    RouterOutlet,
    MatProgressBarModule
  ]
})

export class AppComponent {
  private readonly router = inject(Router);

  private readonly routerEvents = toSignal(this.router.events);

  // Route resolvers (e.g. list-page data fetches) block navigation before the target component
  // even mounts, so a component-level spinner can't cover that window - this shows a top-level
  // bar for the whole navigation instead, from NavigationStart until it settles either way.
  readonly navigating = signal(false);

  constructor() {
    effect(() => {
      const evt = this.routerEvents();
      if (evt instanceof NavigationStart) {
        this.navigating.set(true);
      } else if (evt instanceof NavigationEnd || evt instanceof NavigationCancel || evt instanceof NavigationError) {
        this.navigating.set(false);
      }

      if (evt instanceof NavigationEnd) {
        window.scrollTo(0, 0);
      }
    });
  }

}
