import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {DashboardComponent} from './dashboard.component';
import {DashboardResolver} from './resolver/dashboard-resolver.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    resolve: {
      distributionStates: DashboardResolver
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule {
}
