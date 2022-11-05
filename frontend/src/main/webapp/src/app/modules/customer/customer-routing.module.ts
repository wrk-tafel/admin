import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {CustomerDetailComponent} from './views/customer-detail.component';

import {CustomerEditComponent} from './views/customer-edit.component';
import {CustomerSearchComponent} from './views/customer-search.component';

const routes: Routes = [
  {
    path: 'anlegen',
    component: CustomerEditComponent
  },
  {
    path: 'detail/:id',
    component: CustomerDetailComponent
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
