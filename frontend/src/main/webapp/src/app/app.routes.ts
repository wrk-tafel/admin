import {inject} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivateChildFn, CanActivateFn, ResolveFn, Routes} from '@angular/router';

import {DefaultLayoutComponent} from './common/views/default-layout/default-layout.component';
import {P404Component} from './common/views/error/404.component';
import {P500Component} from './common/views/error/500.component';
import {LoginComponent} from './common/views/login/login.component';

import {AuthGuardService} from './common/security/authguard.service';
import {LoginPasswordChangeComponent} from './common/views/login-passwordchange/login-passwordchange.component';
import {DefaultLayoutResolver} from './common/views/default-layout/resolver/default-layout-resolver.component';
import {
  TicketScreenFullscreenComponent
} from './modules/checkin/ticket-screen-fullscreen/ticket-screen-fullscreen.component';
import {UserPasswordChangeComponent} from './modules/user/user-passwordchange/user-passwordchange.component';

const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  return inject(AuthGuardService).canActivate(route);
};

const authGuardChild: CanActivateChildFn = (route: ActivatedRouteSnapshot) => {
  return inject(AuthGuardService).canActivate(route);
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export const defaultLayoutResolver: ResolveFn<any[]> = () => {
  return inject(DefaultLayoutResolver).resolve();
};

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'uebersicht',
    pathMatch: 'full'
  },
  {
    path: '404',
    component: P404Component
  },
  {
    path: 'anmeldung/ticketmonitor',
    component: TicketScreenFullscreenComponent,
    canActivate: [authGuard]
  },
  {
    path: '500',
    component: P500Component
  },
  {
    path: 'login/passwortaendern',
    component: LoginPasswordChangeComponent
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'login/:errorType',
    component: LoginComponent
  },
  {
    path: '',
    component: DefaultLayoutComponent,
    canActivateChild: [authGuardChild],
    resolve: {
      initialStates: defaultLayoutResolver
    },
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
          permission: 'SCANNER'
        }
      },
      {
        path: 'kunden',
        loadChildren: () => import('./modules/customer/customer.routes').then(m => m.routes),
        data: {
          permission: 'CUSTOMER'
        }
      },
      {
        path: 'benutzer',
        loadChildren: () => import('./modules/user/user.routes').then(m => m.routes),
        data: {
          permission: 'USER_MANAGEMENT'
        }
      },
      {
        path: 'passwortaendern',
        component: UserPasswordChangeComponent
      }
    ]
  },
  {
    path: '**',
    component: P404Component
  }
];
