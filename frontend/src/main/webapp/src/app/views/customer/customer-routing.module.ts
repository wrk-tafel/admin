import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CustomerEditComponent } from './views/customer-edit.component';

const routes: Routes = [
  {
    path: 'anlegen',
    component: CustomerEditComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CustomerRoutingModule { }
