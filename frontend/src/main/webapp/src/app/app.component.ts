import {Component, effect, inject} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';

import {toSignal} from '@angular/core/rxjs-interop';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'body',
  templateUrl: 'app.component.html',
  imports: [
    RouterOutlet
  ]
})

export class AppComponent {
  private readonly router = inject(Router);

  private readonly routerEvents = toSignal(this.router.events);

  constructor() {
    effect(() => {
      const evt = this.routerEvents();
      if (evt instanceof NavigationEnd) {
        window.scrollTo(0, 0);
      }
    });
  }

}
