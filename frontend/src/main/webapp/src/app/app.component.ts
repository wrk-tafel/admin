import {Component, inject, OnInit} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';

import {IconSetService} from '@coreui/icons-angular';
import {freeSet} from '@coreui/icons';
import {TafelToasterComponent} from './common/components/toasts/tafel-toaster.component';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'body',
    templateUrl: 'app.component.html',
    imports: [
        TafelToasterComponent,
        RouterOutlet,
    ]
})

export class AppComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly iconSetService = inject(IconSetService);

  constructor() {
    // iconSet singleton
    this.iconSetService.icons = {...freeSet};
  }

  ngOnInit() {
    this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) {
        return;
      }
      window.scrollTo(0, 0);
    });
  }

}
