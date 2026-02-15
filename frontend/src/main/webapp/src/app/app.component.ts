import {Component, effect, inject} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';

import {IconSetService} from '@coreui/icons-angular';
import {freeSet} from '@coreui/icons';
import {TafelToasterComponent} from './common/components/toasts/tafel-toaster.component';
import {toSignal} from '@angular/core/rxjs-interop';

@Component({
    // tslint:disable-next-line
    selector: 'body',
    templateUrl: 'app.component.html',
    imports: [
        TafelToasterComponent,
        RouterOutlet,
    ]
})

export class AppComponent {
  private readonly router = inject(Router);
  private readonly iconSetService = inject(IconSetService);

  private readonly routerEvents = toSignal(this.router.events);

  constructor() {
    // iconSet singleton
    this.iconSetService.icons = {...freeSet};

    effect(() => {
      const evt = this.routerEvents();
      if (evt instanceof NavigationEnd) {
        window.scrollTo(0, 0);
      }
    });
  }

}
