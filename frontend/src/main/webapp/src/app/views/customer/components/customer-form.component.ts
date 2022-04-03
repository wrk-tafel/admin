import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'customer-form',
  templateUrl: 'customer-form.component.html'
})
export class CustomerFormComponent implements OnInit {
  @Input() initialData: CustomerFormData;
  @Output() dataUpdateEvent = new EventEmitter<CustomerFormData>();

  customerForm = new FormGroup({
    lastname: new FormControl('', [Validators.required, Validators.maxLength(50)]),
    firstname: new FormControl('', [Validators.required, , Validators.maxLength(50)]),
    nationality: new FormControl('', Validators.required),
    street: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    houseNumber: new FormControl('', [Validators.required, Validators.maxLength(10)]),
    stair: new FormControl(''),
    door: new FormControl('', Validators.required),
    postalCode: new FormControl(1030, [Validators.required, Validators.pattern("^[0-9]{4}$")]),
    city: new FormControl('Wien', [Validators.required, Validators.maxLength(50)]),
    birthDate: new FormControl('', Validators.required),
    employer: new FormControl('', Validators.required),
    income: new FormControl('', Validators.required),
    incomeDue: new FormControl('', Validators.required)
  })

  ngOnInit(): void {
    this.customerForm.valueChanges.subscribe((value) => {
      this.dataUpdateEvent.emit(value);
    });
    this.customerForm.patchValue(this.initialData);
  }
}

export interface CustomerFormData {
  lastname?: String,
  firstname?: String,
  nationality?: String,
  street?: String,
  houseNumber?: String,
  stair?: String,
  door?: String,
  postalCode?: number,
  city?: String,
  birthDate?: Date,
  employer?: String,
  income?: number,
  incomeDue?: Date
}
