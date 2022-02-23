import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CustomerComponent } from './customer.component';
import { CustomerRoutingModule } from './customer-routing.module';

@NgModule({
  imports: [
    FormsModule,
    CustomerRoutingModule
  ],
  declarations: [CustomerComponent]
})
export class CustomerModule { }
