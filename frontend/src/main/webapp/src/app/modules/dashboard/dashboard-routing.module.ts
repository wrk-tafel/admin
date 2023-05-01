import {inject, NgModule} from '@angular/core';
import {ResolveFn, RouterModule, Routes} from '@angular/router';

import {DashboardComponent} from './dashboard.component';
import {DashboardResolver} from './resolver/dashboard-resolver.component';
import {DistributionStatesResponse} from '../../api/distribution-api.service';

export const dashboardResolver: ResolveFn<DistributionStatesResponse> = () => {
  return inject(DashboardResolver).resolve();
};

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    resolve: {
      distributionStates: dashboardResolver
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule {
}
