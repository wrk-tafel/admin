import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {Subscription} from 'rxjs';

import {IconSetService} from '@coreui/icons-angular';
import {freeSet} from '@coreui/icons';
import {TafelToasterComponent} from './common/components/toasts/tafel-toaster.component';

@Component({
    // tslint:disable-next-line
    selector: 'body',
    templateUrl: 'app.component.html',
    imports: [
        TafelToasterComponent,
        RouterOutlet,
    ]
})

export class AppComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly iconSetService = inject(IconSetService);
  private routerEventsSubscription: Subscription;

  constructor() {
    // iconSet singleton
    this.iconSetService.icons = {...freeSet};
  }

  ngOnInit() {
    this.routerEventsSubscription = this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) {
        return;
      }
      window.scrollTo(0, 0);
    });
  }

  ngOnDestroy(): void {
    if (this.routerEventsSubscription) {
      this.routerEventsSubscription.unsubscribe();
    }
  }

}
