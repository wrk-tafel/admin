import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { CustomerCreateComponent } from './views/customer-create.component';
import { CustomerRoutingModule } from './customer-routing.module';
import { CustomerFormComponent } from './components/customer-form.component';
import { AddPersonsTableComponent } from './components/addpersons-table.component';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CustomerRoutingModule
  ],
  declarations: [CustomerCreateComponent, CustomerFormComponent, AddPersonsTableComponent]
})
export class CustomerModule { }
