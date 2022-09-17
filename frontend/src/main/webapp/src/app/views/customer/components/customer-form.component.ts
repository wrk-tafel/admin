import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormArray, FormControl, FormGroup, Validators} from '@angular/forms';
import {CountryApiService, CountryData} from '../../../common/api/country-api.service';
import {CustomValidator} from '../../../common/CustomValidator';
import {CustomerAddPersonData, CustomerData} from '../api/customer-api.service';
import {v4 as uuidv4} from 'uuid';

@Component({
  selector: 'customer-form',
  templateUrl: 'customer-form.component.html'
})
export class CustomerFormComponent implements OnInit {
  constructor(
    private countryApiService: CountryApiService
  ) {
  }

  @Input()
  set customerData(customerData: CustomerData) {
    if (customerData) {
      this.form.patchValue(customerData);
      this.additionalPersons.clear();
      customerData.additionalPersons.forEach((person) => this.pushPersonGroupControl(
        {
          ...person,
          key: person.key ? person.key : uuidv4()
        }
      ));
    }
  }

  get customerData() {
    return this.customerData;
  }

  @Output() customerDataChange = new EventEmitter<CustomerData>();

  private form = new FormGroup({
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

    employer: new FormControl(null, Validators.required),
    income: new FormControl(null, Validators.required),
    incomeDue: new FormControl(null, CustomValidator.minDate(new Date())),

    additionalPersons: new FormArray([])
  });

  countries: CountryData[];

  ngOnInit(): void {
    this.countryApiService.getCountries().subscribe((countries) => {
      this.countries = countries;
    });

    this.form.valueChanges.subscribe(() => {
      this.customerDataChange.emit(this.form.value);
    });
  }

  compareCountry(c1: CountryData, c2: CountryData): boolean {
    return c1 && c2 ? c1.id === c2.id : c1 === c2;
  }

  trackBy(index: number, personDataControl: FormGroup) {
    const personData = personDataControl.value;
    console.log("IDX", index, "DATA", personData);
    return personData.key;
  }

  addNewPerson() {
    this.pushPersonGroupControl({
      key: uuidv4(),
      id: null,
      firstname: null,
      lastname: null,
      birthDate: null,
      income: null
    });
  }

  removePerson(index: number) {
    this.additionalPersons.removeAt(index);
  }

  markAllAsTouched() {
    this.form.markAllAsTouched();
  }

  isValid(): boolean {
    return this.form.valid;
  }

  private pushPersonGroupControl(additionalPerson: CustomerAddPersonData) {
    console.log("CREATE CONTROL");
    const control = new FormGroup({
      key: new FormControl(additionalPerson.key),
      id: new FormControl(additionalPerson.id),
      lastname: new FormControl(additionalPerson.lastname, [Validators.required, Validators.maxLength(50)]),
      firstname: new FormControl(additionalPerson.firstname, [Validators.required, , Validators.maxLength(50)]),
      birthDate: new FormControl(additionalPerson.birthDate, [
        Validators.required,
        CustomValidator.minDate(new Date(1920, 0, 1)),
        CustomValidator.maxDate(new Date())
      ]),
      income: new FormControl(additionalPerson.income)
    });
    this.additionalPersons.push(control);
  }

  get id() {
    return this.form.get('id');
  }

  get lastname() {
    return this.form.get('lastname');
  }

  get firstname() {
    return this.form.get('firstname');
  }

  get birthDate() {
    return this.form.get('birthDate');
  }

  get country() {
    return this.form.get('country');
  }

  get telephoneNumber() {
    return this.form.get('telephoneNumber');
  }

  get email() {
    return this.form.get('email');
  }

  get street() {
    return this.form.get('address').get('street');
  }

  get houseNumber() {
    return this.form.get('address').get('houseNumber');
  }

  get stairway() {
    return this.form.get('address').get('stairway');
  }

  get door() {
    return this.form.get('address').get('door');
  }

  get postalCode() {
    return this.form.get('address').get('postalCode');
  }

  get city() {
    return this.form.get('address').get('city');
  }

  get employer() {
    return this.form.get('employer');
  }

  get income() {
    return this.form.get('income');
  }

  get incomeDue() {
    return this.form.get('incomeDue');
  }

  get additionalPersons() {
    return this.form.get('additionalPersons') as FormArray;
  }
}
