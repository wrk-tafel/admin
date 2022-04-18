import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { CustomerEditComponent } from './views/customer-edit.component';
import { CustomerRoutingModule } from './customer-routing.module';
import { CustomerFormComponent } from './components/customer-form.component';
import { CommonModule } from '@angular/common';
import { AddPersonFormComponent } from './components/addperson-form.component';
import { ModalModule } from 'ngx-bootstrap/modal';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CustomerRoutingModule,
    ModalModule.forRoot()
  ],
  declarations: [
    CustomerEditComponent,
    CustomerFormComponent,
    AddPersonFormComponent
  ]
})
export class CustomerModule { }
