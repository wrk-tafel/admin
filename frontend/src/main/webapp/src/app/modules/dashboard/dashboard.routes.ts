import {Routes} from '@angular/router';

import {DashboardComponent} from './dashboard.component';
import {DashboardSheltersDataResolver} from './resolver/dashboard-shelters-resolver-component.service';

export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    resolve: {
      sheltersData: DashboardSheltersDataResolver
    }
  }
];
