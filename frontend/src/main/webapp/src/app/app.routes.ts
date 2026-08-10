import {inject} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivateFn, Routes} from '@angular/router';

import {P404Component} from './common/views/error/404.component';
import {P500Component} from './common/views/error/500.component';
import {LoginComponent} from './common/views/login/login.component';

import {AuthGuardService} from './common/security/authguard.service';

const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => inject(AuthGuardService).canActivate(route);

/**
 * Only the screens a browser can reach without a session stay eager here - the login page itself and
 * the two error pages, which have to render even when nothing else can be fetched. Everything else
 * is behind a `loadComponent`/`loadChildren` boundary so that it is not part of the bundle the login
 * page pulls in; `check-eager-bundle.cjs` guards what is left.
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'uebersicht',
    pathMatch: 'full'
  },
  {
    path: '404',
    title: 'Seite nicht gefunden',
    component: P404Component
  },
  {
    path: 'anmeldung/ticketmonitor',
    title: 'Ticket-Monitor',
    loadComponent: () => import('./modules/checkin/views/ticket-screen-fullscreen/ticket-screen-fullscreen.component')
      .then(m => m.TicketScreenFullscreenComponent),
    canActivate: [authGuard]
  },
  {
    path: '500',
    title: 'Fehler',
    component: P500Component
  },
  {
    path: 'login/passwortaendern',
    title: 'Passwort ändern',
    loadComponent: () => import('./common/views/login-passwordchange/login-passwordchange.component')
      .then(m => m.LoginPasswordChangeComponent)
  },
  {
    path: 'login',
    title: 'Anmeldung',
    component: LoginComponent
  },
  {
    path: 'login/:errorType',
    title: 'Anmeldung',
    component: LoginComponent
  },
  {
    path: '',
    loadChildren: () => import('./shell.routes').then(m => m.routes)
  },
  {
    path: '**',
    title: 'Seite nicht gefunden',
    component: P404Component
  }
];
