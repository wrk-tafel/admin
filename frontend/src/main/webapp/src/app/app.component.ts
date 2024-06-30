import {APP_INITIALIZER, Component, DEFAULT_CURRENCY_CODE, inject, LOCALE_ID, OnInit} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';

import {IconSetService} from '@coreui/icons-angular';
import {freeSet} from '@coreui/icons';
import {HashLocationStrategy, LocationStrategy,} from '@angular/common';
import {HTTP_INTERCEPTORS} from '@angular/common/http';
import {CookieService} from 'ngx-cookie-service';
import {ErrorHandlerInterceptor} from './common/http/errorhandler-interceptor.service';
import {ApiPathInterceptor} from './common/http/apipath-interceptor.service';
import {WebsocketService} from './common/websocket/websocket.service';
import {AuthenticationService} from './common/security/authentication.service';
import {TafelToasterComponent} from './common/views/default-layout/toasts/tafel-toaster.component';

@Component({
  // tslint:disable-next-line
  selector: 'body',
  templateUrl: 'app.component.html',
  providers: [
    {
      provide: LOCALE_ID,
      useValue: 'de-AT'
    },
    {
      provide: DEFAULT_CURRENCY_CODE,
      useValue: 'EUR'
    },
    {
      provide: CookieService,
      useClass: CookieService
    },
    {
      provide: LocationStrategy,
      useClass: HashLocationStrategy
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorHandlerInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiPathInterceptor,
      multi: true
    },
    {
      provide: Window,
      useValue: window
    },
    {
      provide: WebsocketService,
      useClass: WebsocketService
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (authService: AuthenticationService) => () => authService.loadUserInfo(),
      deps: [AuthenticationService],
      multi: true
    },
    IconSetService
  ],
  imports: [
    TafelToasterComponent,
    RouterOutlet
  ],
  standalone: true
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
