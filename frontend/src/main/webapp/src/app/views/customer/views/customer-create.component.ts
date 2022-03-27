import { Component } from '@angular/core';
import { CustomerFormData } from '../components/customer-form.component';

@Component({
  selector: 'customer-create',
  templateUrl: 'customer-create.component.html'
})
export class CustomerCreateComponent {
  customerData: CustomerFormData;

  debug() {
    console.log("FORM-DATA", this.customerData);
  }

  updateFormData(updatedFormData: CustomerFormData) {
    this.customerData = updatedFormData;
  }

}
