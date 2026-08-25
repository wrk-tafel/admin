import {inject} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivateChildFn, Routes} from '@angular/router';
import {MatPaginatorIntl} from '@angular/material/paginator';
import {MAT_TOOLTIP_DEFAULT_OPTIONS, MatTooltipDefaultOptions} from '@angular/material/tooltip';

import {DefaultLayoutComponent} from './common/views/default-layout/default-layout.component';
import {DefaultLayoutResolver} from './common/views/default-layout/resolver/default-layout-resolver.component';
import {AuthGuardService} from './common/security/authguard.service';
import {getGermanPaginatorIntl} from './common/util/german-paginator-intl';
import {UserPasswordChangeComponent} from './modules/user/components/user-passwordchange/user-passwordchange.component';
import {
  PushNotificationSettingsComponent
} from './modules/user/components/push-notification-settings/push-notification-settings.component';

const authGuardChild: CanActivateChildFn = (route: ActivatedRouteSnapshot) => inject(AuthGuardService).canActivate(route);

// Icon-only buttons sit next to each other in dense action columns, so a tooltip that appeared
// instantly would flash on every pass of the mouse. The short delay means it only shows when the
// pointer actually rests on a button.
//
// A tooltip only hides on mouseleave/wheel - never on click - so it stays up over whatever the
// click just revealed underneath it (e.g. the address field that the mail-recipient "+" button
// appends right below itself). Interactive is the default, which makes that overlap swallow
// clicks meant for the element behind it; a passive hint must never do that.
const DEFAULT_TOOLTIP_CONFIG: MatTooltipDefaultOptions = {
  showDelay: 300,
  hideDelay: 0,
  touchendHideDelay: 1500,
  disableTooltipInteractivity: true
};

/**
 * Everything behind the login: the application shell plus every feature area rendered inside it.
 *
 * Loaded lazily from `app.routes.ts` so that a first visit to `/login` does not pay for the shell.
 * Both providers below configure Angular Material components that only ever appear on a screen
 * within this shell, so they live here rather than in `appConfig` - a route-level provider shadows
 * the root one for everything created underneath it, and keeping them here keeps
 * `@angular/material/paginator` and `@angular/material/tooltip` out of the eager bundle.
 * `MAT_DIALOG_DEFAULT_OPTIONS` cannot move along with them: `MatDialog` is `providedIn: 'root'`, so
 * it reads its defaults from the root injector no matter which route opened the dialog.
 */
export const routes: Routes = [
  {
    path: '',
    component: DefaultLayoutComponent,
    canActivateChild: [authGuardChild],
    resolve: {
      initialStates: DefaultLayoutResolver
    },
    providers: [
      {
        provide: MatPaginatorIntl,
        useFactory: getGermanPaginatorIntl
      },
      {
        provide: MAT_TOOLTIP_DEFAULT_OPTIONS,
        useValue: DEFAULT_TOOLTIP_CONFIG
      }
    ],
    children: [
      {
        path: 'uebersicht',
        loadChildren: () => import('./modules/dashboard/dashboard.routes').then(m => m.routes),
        data: {
          anyPermission: true
        }
      },
      {
        path: 'anmeldung',
        loadChildren: () => import('./modules/checkin/checkin.routes').then(m => m.routes),
        data: {
          anyPermissionOf: ['SCANNER', 'CHECKIN']
        }
      },
      {
        path: 'kunden',
        loadChildren: () => import('./modules/customer/customer.routes').then(m => m.routes),
        data: {
          anyPermissionOf: ['CUSTOMER']
        }
      },
      {
        path: 'logistik',
        loadChildren: () => import('./modules/logistics/logistics.routes').then(m => m.routes),
        data: {
          anyPermissionOf: ['LOGISTICS']
        }
      },
      {
        path: 'benutzer',
        loadChildren: () => import('./modules/user/user.routes').then(m => m.routes),
        data: {
          anyPermissionOf: ['USER_MANAGEMENT']
        }
      },
      {
        path: 'einstellungen',
        loadChildren: () => import('./modules/settings/settings.routes').then(m => m.routes),
        data: {
          anyPermissionOf: ['SETTINGS']
        }
      },
      {
        path: 'aenderungsprotokoll',
        loadChildren: () => import('./modules/audit/audit.routes').then(m => m.routes),
        data: {
          anyPermissionOf: ['AUDIT_LOG']
        }
      },
      {
        path: 'datenauskunft',
        loadChildren: () => import('./modules/data-subject-request/data-subject-request.routes').then(m => m.routes),
        data: {
          anyPermissionOf: ['DATA_SUBJECT_REQUESTS']
        }
      },
      {
        path: 'statistiken',
        loadChildren: () => import('./modules/statistics/statistics.routes').then(m => m.routes),
        data: {
          anyPermissionOf: ['STATISTICS']
        }
      },
      {
        path: 'passwortaendern',
        title: 'Passwort ändern',
        component: UserPasswordChangeComponent
      },
      {
        path: 'benachrichtigungen',
        title: 'Benachrichtigungen',
        component: PushNotificationSettingsComponent
      }
    ]
  }
];
