import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import * as moment from 'moment';
import { CountryApiService, CountryData } from '../../../common/api/country-api.service';
import { CustomValidator } from '../../../common/CustomValidator';
import { CustomerAddPersonData, CustomerData } from '../api/customer-api.service';

// TODO maybe integrate into customer-edit
@Component({
  selector: 'customer-form',
  templateUrl: 'customer-form.component.html'
})
export class CustomerFormComponent implements OnInit {
  constructor(
    private countryApiService: CountryApiService
  ) { }

  /*
  TODO impl
  @Input() 
    set customerData(customerData: CustomerData) {
      this.form.patchValue(customerData);
    }
    get customerData() { return this.customerData; }

  */
  @Output() dataUpdatedEvent = new EventEmitter<CustomerData>();

  form = new FormGroup({
    id: new FormControl(null),
    lastname: new FormControl(null, [Validators.required, Validators.maxLength(50)]),
    firstname: new FormControl(null, [Validators.required, Validators.maxLength(50)]),
    birthDate: new FormControl(null,
      [
        Validators.required,
        CustomValidator.minDate(new Date(1920, 0, 1)),
        CustomValidator.maxDate(new Date())
      ]
    ),

    country: new FormControl({}, Validators.required),
    telephoneNumber: new FormControl(null),
    email: new FormControl(null, [Validators.maxLength(100), Validators.email]),

    address: new FormGroup({
      street: new FormControl(null, [Validators.required, Validators.maxLength(100)]),
      houseNumber: new FormControl(null, [Validators.required, Validators.maxLength(10)]),
      stairway: new FormControl(null),
      door: new FormControl(null),
      postalCode: new FormControl(null, [Validators.required, Validators.pattern('^[0-9]{4}$')]),
      city: new FormControl(null, [Validators.required, Validators.maxLength(50)]),
    }),

    additionalPersons: new FormArray([
      new FormGroup({
        uuid: new FormControl(),
        lastname: new FormControl(null, [Validators.required, Validators.maxLength(50)]),
        firstname: new FormControl(null, [Validators.required, , Validators.maxLength(50)]),
        birthDate: new FormControl(null, [
          Validators.required,
          CustomValidator.minDate(new Date(1920, 0, 1)),
          CustomValidator.maxDate(new Date())
        ]),
        income: new FormControl(null)
      })
    ]),

    employer: new FormControl(null, Validators.required),
    income: new FormControl(null, Validators.required),
    incomeDue: new FormControl(null, CustomValidator.minDate(new Date()))
  });

  customerData: CustomerData = {
    id: 123,
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: moment().subtract(20, 'years').startOf('day').utc().toDate(),
    country: { id: 0, code: 'AT', name: 'Österreich' },
    telephoneNumber: 660123123,
    email: 'test@mail.com',
    address: {
      street: 'Testgasse',
      houseNumber: '123A',
      door: '1',
      stairway: '1',
      postalCode: 1234,
      city: 'Wien',
    },
    employer: 'WRK',
    income: 123.50,
    incomeDue: moment().add(1, 'years').startOf('day').toDate(),
    additionalPersons: []
  };
  countries: CountryData[];

  ngOnInit(): void {
    const editedCustomerData = {
      ...this.customerData,
      birthDate: moment(this.customerData.birthDate).format('yyyy-MM-DD'),
      incomeDue: moment(this.customerData.incomeDue).format('yyyy-MM-DD')
    };
    this.form.patchValue(editedCustomerData);

    this.countryApiService.getCountries().subscribe((countries) => this.countries = countries);

    this.form.valueChanges.subscribe(() => {
      this.dataUpdatedEvent.emit(this.form.value);
    });
  }

  compareCountry(c1: CountryData, c2: CountryData): boolean {
    return c1 && c2 ? c1.id === c2.id : c1 === c2;
  }
}

export interface CustomerAddPersonFormData extends CustomerAddPersonData {
  uuid?: string;
}
