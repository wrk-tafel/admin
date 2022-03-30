import { Component } from '@angular/core';
import { CustomerFormData } from '../components/customer-form.component';

@Component({
  selector: 'customer-create',
  templateUrl: 'customer-create.component.html'
})
export class CustomerCreateComponent {
  customerData: CustomerFormData;

  updateFormData(updatedFormData: CustomerFormData) {
    this.customerData = updatedFormData;
  }

}
