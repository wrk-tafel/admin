import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Country, CustomerApiService } from '../api/customer-api.service';

@Component({
  selector: 'customer-form',
  templateUrl: 'customer-form.component.html'
})
export class CustomerFormComponent implements OnInit {
  constructor(
    private customerApiService: CustomerApiService
  ) { }

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

  countries: Country[];

  ngOnInit(): void {
    this.customerApiService.getCountries().subscribe((data: Country[]) => {
      this.countries = data;
    });

    this.customerForm.valueChanges.subscribe((value) => {
      this.dataUpdateEvent.emit(value);
    });
    this.customerForm.patchValue(this.initialData);
  }

  get lastname() { return this.customerForm.get('lastname'); }
  get firstname() { return this.customerForm.get('firstname'); }
  get nationality() { return this.customerForm.get('nationality'); }
  get street() { return this.customerForm.get('street'); }
  get houseNumber() { return this.customerForm.get('houseNumber'); }
  get stair() { return this.customerForm.get('stair'); }
  get door() { return this.customerForm.get('door'); }
  get postalCode() { return this.customerForm.get('postalCode'); }
  get city() { return this.customerForm.get('city'); }
  get birthDate() { return this.customerForm.get('birthDate'); }
  get employer() { return this.customerForm.get('employer'); }
  get income() { return this.customerForm.get('income'); }
  get incomeDue() { return this.customerForm.get('incomeDue'); }

  debug() {
    console.log("SEL COUNTRY", this.nationality.value);
    console.log("FORM", this.customerForm);
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
