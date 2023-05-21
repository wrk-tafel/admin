import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {UntypedFormArray, UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {CountryApiService, CountryData} from '../../../../api/country-api.service';
import {CustomValidator} from '../../../../common/validator/CustomValidator';
import {CustomerAddPersonData, CustomerData} from '../../../../api/customer-api.service';
import {v4 as uuidv4} from 'uuid';
import * as moment from 'moment';

@Component({
  selector: 'tafel-customer-form',
  templateUrl: 'customer-form.component.html'
})
export class CustomerFormComponent implements OnInit {
  @Input() editMode = false;
  @Output() customerDataChange = new EventEmitter<CustomerData>();

  constructor(
    private countryApiService: CountryApiService
  ) {
  }

  // TODO migrate to typed form
  form = new UntypedFormGroup({
    id: new UntypedFormControl(null),
    lastname: new UntypedFormControl(null, [Validators.required, Validators.maxLength(50)]),
    firstname: new UntypedFormControl(null, [Validators.required, Validators.maxLength(50)]),
    birthDate: new UntypedFormControl(null,
      [
        Validators.required,
        CustomValidator.minDate(new Date(1900, 0, 1)),
        CustomValidator.maxDate(new Date())
      ]
    ),

    country: new UntypedFormControl(null, Validators.required),
    telephoneNumber: new UntypedFormControl(null, [Validators.pattern('^[0-9]*$')]),
    email: new UntypedFormControl(null, [Validators.maxLength(100), Validators.email]),

    address: new UntypedFormGroup({
      street: new UntypedFormControl(null, [Validators.required, Validators.maxLength(100)]),
      houseNumber: new UntypedFormControl(null, [Validators.required, Validators.maxLength(10)]),
      stairway: new UntypedFormControl(null),
      door: new UntypedFormControl(null),
      postalCode: new UntypedFormControl(null, [Validators.required, Validators.pattern('^[0-9]{4}$')]),
      city: new UntypedFormControl(null, [Validators.required, Validators.maxLength(50)]),
    }),

    employer: new UntypedFormControl(null, Validators.required),
    income: new UntypedFormControl(null, Validators.required),
    incomeDue: new UntypedFormControl(null, [CustomValidator.minDate(new Date())]),

    validUntil: new UntypedFormControl(null, [
      Validators.required,
      CustomValidator.minDate(new Date())
    ]),

    additionalPersons: new UntypedFormArray([])
  });
  countries: CountryData[];

  get customerData() {
    return this.customerData;
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

  ngOnInit(): void {
    this.countryApiService.getCountries().subscribe((countries) => {
      this.countries = countries;
    });

    this.incomeDue.valueChanges.subscribe(() => {
      this.updateValidUntilDate();
    });

    this.form.valueChanges.subscribe(() => {
      this.customerDataChange.emit(this.form.value);
    });
  }

  updateValidUntilDate() {
    let incomeDueValues = [];
    if (this.incomeDue.value) {
      incomeDueValues.push(this.incomeDue.value);
    }

    for (let i = 0; i < this.additionalPersons.length; i++) {
      const value = this.additionalPersons.at(i).get('incomeDue').value;
      if (value) {
        incomeDueValues.push(value);
      }
    }

    incomeDueValues = incomeDueValues.map((dateString) => moment(dateString, 'YYYY-MM-DD').toDate());

    if (incomeDueValues.length > 0) {
      const minIncomeDueValue = new Date(Math.min.apply(null, incomeDueValues));

      const derivedValidUntilDate = moment(minIncomeDueValue)
        .add(2, 'months')
        .format('YYYY-MM-DD');
      this.validUntil.setValue(derivedValidUntilDate);
    }
  }

  compareCountry(c1: CountryData, c2: CountryData): boolean {
    return c1 && c2 ? c1.id === c2.id : c1 === c2;
  }

  trackBy(index: number, personDataControl: UntypedFormGroup) {
    const personData = personDataControl.value;
    return personData.key;
  }

  addNewPerson() {
    this.pushPersonGroupControl({
      key: uuidv4(),
      id: null,
      firstname: null,
      lastname: null,
      birthDate: null,
      country: null,
      employer: null,
      income: null,
      incomeDue: null,
      excludeFromHousehold: false
    });

    if (this.editMode) {
      this.additionalPersons.at(this.additionalPersons.length - 1).markAllAsTouched();
    }
  }

  removePerson(index: number) {
    this.additionalPersons.removeAt(index);
    this.updateValidUntilDate();
  }

  markAllAsTouched() {
    this.form.markAllAsTouched();
  }

  isValid(): boolean {
    return this.form.valid;
  }

  private pushPersonGroupControl(additionalPerson: CustomerAddPersonData) {
    const control = new UntypedFormGroup({
      key: new UntypedFormControl(additionalPerson.key),
      id: new UntypedFormControl(additionalPerson.id),
      lastname: new UntypedFormControl(additionalPerson.lastname, [Validators.required, Validators.maxLength(50)]),
      firstname: new UntypedFormControl(additionalPerson.firstname, [Validators.required, Validators.maxLength(50)]),
      birthDate: new UntypedFormControl(additionalPerson.birthDate, [
        Validators.required,
        CustomValidator.minDate(new Date(1920, 0, 1)),
        CustomValidator.maxDate(new Date())
      ]),
      country: new UntypedFormControl(additionalPerson.country, Validators.required),
      employer: new UntypedFormControl(additionalPerson.employer),
      income: new UntypedFormControl(additionalPerson.income),
      incomeDue: new UntypedFormControl(additionalPerson.incomeDue, [
        CustomValidator.minDate(new Date())
      ]),
      excludeFromHousehold: new UntypedFormControl(additionalPerson.excludeFromHousehold)
    });

    control.get('incomeDue').valueChanges.subscribe(() => {
      this.updateValidUntilDate();
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

  get validUntil() {
    return this.form.get('validUntil');
  }

  get additionalPersons() {
    return this.form.get('additionalPersons') as UntypedFormArray;
  }

}
