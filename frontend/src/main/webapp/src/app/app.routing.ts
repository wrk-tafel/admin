import {inject, NgModule} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivateChildFn, ResolveFn, RouterModule, Routes} from '@angular/router';

import {DefaultLayoutComponent} from './common/views/default-layout/default-layout.component';
import {P404Component} from './common/views/error/404.component';
import {P500Component} from './common/views/error/500.component';
import {LoginComponent} from './common/views/login/login.component';

import {AuthGuardService} from './common/security/authguard.service';
import {LoginPasswordChangeComponent} from './common/views/login-passwordchange/login-passwordchange.component';
import {DefaultLayoutResolver} from './common/views/default-layout/resolver/default-layout-resolver.component';

const authGuard: CanActivateChildFn = (route: ActivatedRouteSnapshot) => {
  return inject(AuthGuardService).canActivateChild(route);
};

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
    canActivateChild: [authGuard],
    resolve: {
      initialStates: defaultLayoutResolver
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
      },
      {
        path: 'benutzer',
        loadChildren: () => import('./modules/user/user.module').then(m => m.UserModule)
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
