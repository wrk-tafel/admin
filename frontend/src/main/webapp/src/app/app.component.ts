import {Component, effect, inject} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {ToastContainerDirective} from 'ngx-toastr';

import {IconSetService} from '@coreui/icons-angular';
import {freeSet} from '@coreui/icons';
import {toSignal} from '@angular/core/rxjs-interop';

@Component({
    // tslint:disable-next-line
    selector: 'body',
    templateUrl: 'app.component.html',
    imports: [
        RouterOutlet,
        ToastContainerDirective,
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
