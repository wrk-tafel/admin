import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { CustomerEditComponent } from './views/customer-edit.component';
import { CustomerRoutingModule } from './customer-routing.module';
import { CustomerFormComponent } from './components/customer-form.component';
import { CommonModule } from '@angular/common';
import { AddPersonCardComponent } from './components/addperson-card.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CustomerRoutingModule
  ],
  declarations: [
    CustomerEditComponent,
    CustomerFormComponent,
    AddPersonCardComponent
  ]
})
export class CustomerModule { }
