import {Component, inject, OnInit} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';

import {IconSetService} from '@coreui/icons-angular';
import {freeSet} from '@coreui/icons';

@Component({
  // tslint:disable-next-line
  selector: 'body',
  templateUrl: 'app.component.html',
  providers: [IconSetService],
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private iconSetService = inject(IconSetService);

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
