import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CustomerDetailComponent } from './views/customer-detail.component';

import { CustomerEditComponent } from './views/customer-edit.component';
import { CustomerSearchComponent } from './views/customer-search.component';

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
    path: 'suchen',
    component: CustomerSearchComponent
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerRoutingModule { }
