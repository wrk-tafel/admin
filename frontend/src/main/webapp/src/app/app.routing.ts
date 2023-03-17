import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {DefaultLayoutComponent} from './common/views/default-layout/default-layout.component';
import {P404Component} from './common/views/error/404.component';
import {P500Component} from './common/views/error/500.component';
import {LoginComponent} from './common/views/login/login.component';

import {AuthGuardService as AuthGuard} from './common/security/authguard.service';
import {LoginPasswordChangeComponent} from './common/views/login-passwordchange/login-passwordchange.component';
import {DefaultLayoutResolver} from './common/views/default-layout/resolver/default-layout-resolver.component';

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
    canActivateChild: [AuthGuard],
    resolve: {
      initialStates: DefaultLayoutResolver
    },
    children: [
      {
        path: 'uebersicht',
        loadChildren: () => import('./modules/dashboard/dashboard.module').then(m => m.DashboardModule),
        data: {
          permission: 'DASHBOARD'
        }
      },
      {
        path: 'anmeldung',
        loadChildren: () => import('./modules/checkin/checkin.module').then(m => m.CheckinModule),
        data: {
          permission: 'SCANNER'
        }
      },
      {
        path: 'kunden',
        loadChildren: () => import('./modules/customer/customer.module').then(m => m.CustomerModule),
        data: {
          permission: 'CUSTOMER'
        }
      }
    ]
  },
  {
    path: '**',
    component: P404Component
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true, onSameUrlNavigation: 'reload'})],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
