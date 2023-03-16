import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {CustomerDetailComponent} from './views/customer-detail/customer-detail.component';

import {CustomerEditComponent} from './views/customer-edit/customer-edit.component';
import {CustomerSearchComponent} from './views/customer-search/customer-search.component';
import {CustomerDataResolver} from './resolver/customerdata-resolver.component';

const routes: Routes = [
  {
    path: 'anlegen',
    component: CustomerEditComponent
  },
  {
    path: 'detail/:id',
    component: CustomerDetailComponent,
    resolve: {
      customerData: CustomerDataResolver
    }
  },
  {
    path: 'bearbeiten/:id',
    component: CustomerEditComponent
  },
  {
    path: 'suchen',
    component: CustomerSearchComponent
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerRoutingModule {
}
