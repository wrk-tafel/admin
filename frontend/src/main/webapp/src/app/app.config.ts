import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  importProvidersFrom,
  inject,
  isDevMode,
  LOCALE_ID,
  provideAppInitializer,
  provideCheckNoChangesConfig,
  provideZonelessChangeDetection
} from '@angular/core';
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

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    ...(isDevMode() ? [
      provideCheckNoChangesConfig({exhaustive: true, interval: 1000}),
    ] : []),
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
    provideAppInitializer(() => {
      const initializerFn = ((authService: AuthenticationService) => () => authService.loadUserInfo())(inject(AuthenticationService));
      return initializerFn();
    })
  ]
};
