import {NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import {CustomerEditComponent} from './views/customer-edit/customer-edit.component';
import {CustomerRoutingModule} from './customer-routing.module';
import {CustomerFormComponent} from './views/customer-form/customer-form.component';
import {CommonModule} from '@angular/common';
import {ModalModule} from 'ngx-bootstrap/modal';
import {CustomerDetailComponent} from './views/customer-detail/customer-detail.component';
import {CustomerSearchComponent} from './views/customer-search/customer-search.component';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {CustomerApiService} from '../../api/customer-api.service';
import {TabsModule} from 'ngx-bootstrap/tabs';

@NgModule({
  imports: [
    BsDropdownModule,
    CommonModule,
    ReactiveFormsModule,
    CustomerRoutingModule,
    ModalModule,
    TabsModule,
    FormsModule
  ],
  declarations: [
    CustomerDetailComponent,
    CustomerEditComponent,
    CustomerFormComponent,
    CustomerSearchComponent
  ],
  providers: [
    CustomerApiService
  ]
})
export class CustomerModule {
}
