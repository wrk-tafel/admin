import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  inject,
  isDevMode,
  LOCALE_ID,
  provideAppInitializer
} from '@angular/core';
import {provideServiceWorker} from '@angular/service-worker';
import {
  provideRouter,
  withComponentInputBinding,
  withHashLocation,
  withInMemoryScrolling,
  withRouterConfig,
  withViewTransitions
} from '@angular/router';

import {routes} from './app.routes';
import {provideHttpClient, withInterceptors, withXhr} from '@angular/common/http';
import {CookieService} from 'ngx-cookie-service';
import {HashLocationStrategy, LocationStrategy} from '@angular/common';
import {errorHandlerInterceptor} from './common/http/errorhandler-interceptor.service';
import {apiPathInterceptor} from './common/http/apipath-interceptor.service';
import {xsrfInterceptor} from './common/http/xsrf-interceptor.service';
import {AuthenticationService} from './common/security/authentication.service';
import {SwUpdateService} from './common/pwa/sw-update.service';
import {MAT_DIALOG_DEFAULT_OPTIONS, MatDialogConfig} from '@angular/material/dialog';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {MAT_FORM_FIELD_DEFAULT_OPTIONS} from '@angular/material/form-field';
import {MatPaginatorIntl} from '@angular/material/paginator';
import {getGermanPaginatorIntl} from './common/util/german-paginator-intl';

const DEFAULT_DIALOG_CONFIG: MatDialogConfig = {
  position: {top: '16px'}
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withXhr(),
      withInterceptors([
        apiPathInterceptor,
        xsrfInterceptor,
        errorHandlerInterceptor
      ])
    ),
    provideRouter(routes,
      withRouterConfig({
        onSameUrlNavigation: 'reload'
      }),
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled'
      }),
      withViewTransitions(),
      withHashLocation(),
      withComponentInputBinding()
    ),
    provideAppInitializer(() => inject(AuthenticationService).loadUserInfo()),
    provideAppInitializer(() => inject(SwUpdateService).init()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
    provideAnimationsAsync(),
    {
      provide: LOCALE_ID,
      useValue: 'de-DE'
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
      provide: Window,
      useValue: window
    },
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: DEFAULT_DIALOG_CONFIG
    },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        appearance: 'outline',
        floatLabel: 'always',
      }
    },
    {
      provide: MatPaginatorIntl,
      useFactory: getGermanPaginatorIntl
    }
  ]
};
