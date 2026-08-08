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
  RedirectCommand,
  Router,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withNavigationErrorHandler,
  withRouterConfig,
  withViewTransitions
} from '@angular/router';

import {routes} from './app.routes';
import {provideHttpClient, withInterceptors, withXhr} from '@angular/common/http';
import {CookieService} from 'ngx-cookie-service';
import {errorHandlerInterceptor} from './common/http/errorhandler-interceptor.service';
import {apiPathInterceptor} from './common/http/apipath-interceptor.service';
import {xsrfInterceptor} from './common/http/xsrf-interceptor.service';
import {AuthenticationService} from './common/security/authentication.service';
import {SwUpdateService} from './common/pwa/sw-update.service';
import {MAT_DIALOG_DEFAULT_OPTIONS, MatDialogConfig} from '@angular/material/dialog';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {MAT_FORM_FIELD_DEFAULT_OPTIONS} from '@angular/material/form-field';
import {MAT_CARD_CONFIG} from '@angular/material/card';
import {MatPaginatorIntl} from '@angular/material/paginator';
import {getGermanPaginatorIntl} from './common/util/german-paginator-intl';
import {MAT_TOOLTIP_DEFAULT_OPTIONS, MatTooltipDefaultOptions} from '@angular/material/tooltip';

const DEFAULT_DIALOG_CONFIG: MatDialogConfig = {
  position: {top: '16px'}
};

// Icon-only buttons sit next to each other in dense action columns, so a tooltip that appeared
// instantly would flash on every pass of the mouse. The short delay means it only shows when the
// pointer actually rests on a button.
const DEFAULT_TOOLTIP_CONFIG: MatTooltipDefaultOptions = {
  showDelay: 300,
  hideDelay: 0,
  touchendHideDelay: 1500
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
      withComponentInputBinding(),
      // A resolver failing (e.g. a bookmarked/direct-linked detail page whose entity was since
      // deleted) needs an explicit fallback here: with real paths, that request is a genuine
      // full-page load rather than an in-app navigation, so there's no previous in-app route left
      // to fall back to on failure - without this handler the user is left on a blank shell.
      withNavigationErrorHandler(() => new RedirectCommand(inject(Router).parseUrl('/404')))
    ),
    provideAppInitializer(() => inject(AuthenticationService).loadUserInfo()),
    provideAppInitializer(() => inject(SwUpdateService).init()),
    provideServiceWorker('ngsw-worker.js', {
      // An active service worker serves navigations from its own cache, bypassing Cypress's
      // network layer - this made cy.visit() unreliable (e.g. a fresh navigation's onBeforeLoad
      // never firing) once a prior test in the same run had let the worker take control of the
      // page. window.Cypress is only defined when the app runs inside a Cypress test.
      enabled: !isDevMode() && !(window as unknown as {Cypress?: unknown}).Cypress,
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
      provide: MAT_CARD_CONFIG,
      useValue: {appearance: 'outlined'}
    },
    {
      provide: MAT_TOOLTIP_DEFAULT_OPTIONS,
      useValue: DEFAULT_TOOLTIP_CONFIG
    },
    {
      provide: MatPaginatorIntl,
      useFactory: getGermanPaginatorIntl
    }
  ]
};
