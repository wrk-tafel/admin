import {NgModule} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';

import {CustomerEditComponent} from './views/customer-edit.component';
import {CustomerRoutingModule} from './customer-routing.module';
import {CustomerFormComponent} from './components/customer-form.component';
import {CommonModule} from '@angular/common';
import {ModalModule} from 'ngx-bootstrap/modal';
import {CustomerDetailComponent} from './views/customer-detail.component';
import {CustomerSearchComponent} from './views/customer-search.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CustomerRoutingModule,
    ModalModule.forRoot()
  ],
  declarations: [
    CustomerDetailComponent,
    CustomerEditComponent,
    CustomerFormComponent,
    CustomerSearchComponent
  ]
})
export class CustomerModule {
}
