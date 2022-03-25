import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CustomerComponent } from './customer.component';
import { CustomerRoutingModule } from './customer-routing.module';
import { CustomerFormComponent } from './components/customer-form.component';

@NgModule({
  imports: [
    FormsModule,
    CustomerRoutingModule
  ],
  declarations: [CustomerComponent, CustomerFormComponent]
})
export class CustomerModule { }
