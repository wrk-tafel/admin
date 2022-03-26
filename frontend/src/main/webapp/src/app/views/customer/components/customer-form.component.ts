import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'customer-form',
  templateUrl: 'customer-form.component.html'
})
export class CustomerFormComponent {
  customerForm = new FormGroup({
    lastname: new FormControl('', Validators.required),
    firstname: new FormControl('', Validators.required),
    nationality: new FormControl('', Validators.required),
    street: new FormControl('', Validators.required),
    houseNumber: new FormControl('', Validators.required),
    stair: new FormControl(''),
    door: new FormControl('', Validators.required),
    postalCode: new FormControl('1030', Validators.required),
    city: new FormControl('Wien', Validators.required),
    birthDate: new FormControl('', Validators.required),
    employer: new FormControl('', Validators.required),
    income: new FormControl('', Validators.required),
    incomeDue: new FormControl('', Validators.required)
  });

  public save() {
    // TODO
    console.log("SAVE CALLED");
  }
}
