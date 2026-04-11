import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  importProvidersFrom,
  inject,
  LOCALE_ID,
  provideAppInitializer
} from '@angular/core';
import {provideToastr} from 'ngx-toastr';
import {
  provideRouter,
  withComponentInputBinding,
  withHashLocation,
  withInMemoryScrolling,
  withRouterConfig,
  withViewTransitions
} from '@angular/router';

import {DropdownModule, SidebarModule} from '@coreui/angular';
import {IconSetService} from '@coreui/icons-angular';
import {routes} from './app.routes';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {CookieService} from 'ngx-cookie-service';
import {HashLocationStrategy, LocationStrategy} from '@angular/common';
import {errorHandlerInterceptor} from './common/http/errorhandler-interceptor.service';
import {apiPathInterceptor} from './common/http/apipath-interceptor.service';
import {AuthenticationService} from './common/security/authentication.service';
import {MAT_DIALOG_DEFAULT_OPTIONS, MatDialogConfig} from '@angular/material/dialog';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';

const DEFAULT_DIALOG_CONFIG: MatDialogConfig = {
  position: {top: '16px'}
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideToastr({
      timeOut: 5000,
      closeButton: true,
      preventDuplicates: true,
      includeTitleDuplicates: true,
      resetTimeoutOnDuplicate: true,
      maxOpened: 3,
      autoDismiss: true,
      progressBar: true,
    }),
    provideHttpClient(
      withInterceptors([
        apiPathInterceptor,
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
    importProvidersFrom(SidebarModule, DropdownModule),
    IconSetService,
    provideAppInitializer(() => inject(AuthenticationService).loadUserInfo()),
    provideAnimationsAsync(),
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
      provide: Window,
      useValue: window
    },
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: DEFAULT_DIALOG_CONFIG
    }
  ]
};
