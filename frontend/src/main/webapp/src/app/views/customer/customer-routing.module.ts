import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CustomerDetailComponent } from './views/customer-detail.component';

import { CustomerEditComponent } from './views/customer-edit.component';

const routes: Routes = [
  {
    path: 'anlegen',
    component: CustomerEditComponent
  },
  {
    path: 'detail/:id',
    component: CustomerDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerRoutingModule { }
