import { Component } from '@angular/core';

@Component({
  selector: 'customer-form',
  templateUrl: 'customer-form.component.html'
})
export class CustomerFormComponent {
  customer: Customer = {};

  public showLastName() {
    console.log("DEBUG", this.customer)
  }
}

interface Customer {
  lastName?: String
  firstName?: String
  nationality?: String
  street?: String
  houseNumber?: String
  stair?: String
  door?: String
  postalCode?: number
  city?: String
  birthDate?: Date
  employer?: String
  income?: number
  incomeDue?: Date
}
