import {Component, effect, inject, input, OnDestroy, OnInit, output} from '@angular/core';
import {FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {CountryApiService, CountryData} from '../../../../api/country-api.service';
import {CustomValidator} from '../../../../common/validator/CustomValidator';
import {CustomerAddPersonData, CustomerData, Gender} from '../../../../api/customer-api.service';
import {v4 as uuidv4} from 'uuid';
import moment from 'moment';
import {CommonModule} from '@angular/common';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ColComponent,
  FormCheckInputDirective,
  FormSelectDirective,
  InputGroupComponent,
  InputGroupTextDirective,
  RowComponent
} from '@coreui/angular';
import {
  faBuilding,
  faEnvelope,
  faEuroSign,
  faFlag,
  faLocationDot,
  faPhone,
  faVenusMars
} from '@fortawesome/free-solid-svg-icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {GenderLabelPipe} from '../../../../common/pipes/gender-label.pipe';

@Component({
    selector: 'tafel-customer-form',
    templateUrl: 'customer-form.component.html',
    imports: [
        ReactiveFormsModule,
        InputGroupComponent,
        CardComponent,
        CardHeaderComponent,
        RowComponent,
        ColComponent,
        CardBodyComponent,
        CardFooterComponent,
        CommonModule,
        InputGroupTextDirective,
        FormSelectDirective,
        ButtonDirective,
        FaIconComponent,
        TafelAutofocusDirective,
        FormCheckInputDirective,
        GenderLabelPipe
    ]
})
export class CustomerFormComponent implements OnInit, OnDestroy {
  editMode = input(false);
  customerData = input<CustomerData>();
  customerDataChange = output<CustomerData>();

  private readonly countryApiService = inject(CountryApiService);
  private destroy$ = new Subject<void>();

  form = new FormGroup({
    id: new FormControl<number>(null),
    lastname: new FormControl<string>(null, [Validators.required, Validators.maxLength(50)]),
    firstname: new FormControl<string>(null, [Validators.required, Validators.maxLength(50)]),
    birthDate: new FormControl<Date>(null, [
      Validators.required,
      CustomValidator.minDate(new Date(1900, 0, 1)),
      CustomValidator.maxDate(new Date())
    ]),
    gender: new FormControl<Gender>(null, [Validators.required]),

    country: new FormControl<CountryData>(null, Validators.required),
    telephoneNumber: new FormControl<string>(null, [Validators.required, Validators.pattern('^[0-9]*$')]),
    email: new FormControl<string>(null, [Validators.maxLength(100), Validators.email]),

    address: new FormGroup({
      street: new FormControl<string>(null, [Validators.required, Validators.maxLength(100)]),
      houseNumber: new FormControl<string>(null, [Validators.required, Validators.maxLength(10)]),
      stairway: new FormControl<string>(null),
      door: new FormControl<string>(null),
      postalCode: new FormControl<number>(null, [Validators.required, Validators.pattern('^[0-9]{4}$')]),
      city: new FormControl<string>(null, [Validators.required, Validators.maxLength(50)]),
    }),

    employer: new FormControl<string>(null, Validators.required),
    income: new FormControl<number>(null, [
      Validators.min(1)
    ]),
    incomeDue: new FormControl<Date>(null, [CustomValidator.minDate(new Date())]),

    validUntil: new FormControl<Date>(null, [
      Validators.required,
      CustomValidator.minDate(new Date())
    ]),

    additionalPersons: new FormArray([])
  });

  countries: CountryData[];
  genders: Gender[] = [Gender.FEMALE, Gender.MALE];

  constructor() {
    effect(() => {
      const customerData = this.customerData();
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
    });
  }

  ngOnInit(): void {
    this.countryApiService.getCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe((countries) => {
        this.countries = countries;
      });

    this.incomeDue.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateValidUntilDate();
      });

    this.form.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.customerDataChange.emit(this.form.getRawValue());
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

      const derivedValidUntilDate = moment(minIncomeDueValue).add(2, 'months').toDate();
      this.validUntil.setValue(derivedValidUntilDate);
    }
  }

  compareCountry(c1: CountryData, c2: CountryData): boolean {
    return c1 && c2 ? c1.id === c2.id : c1 === c2;
  }

  trackBy(index: number, personDataControl: FormGroup) {
    const personData = personDataControl.value;
    return personData.key;
  }

  trackByGender(gender: Gender) {
    return gender;
  }

  trackByCountryId(countryId: number) {
    return countryId;
  }

  addNewPerson() {
    this.pushPersonGroupControl({
      key: uuidv4(),
      id: null,
      firstname: null,
      lastname: null,
      birthDate: null,
      gender: null,
      country: null,
      employer: null,
      income: null,
      incomeDue: null,
      excludeFromHousehold: false,
      receivesFamilyBonus: true
    });

    if (this.editMode()) {
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
    const control = new FormGroup({
      key: new FormControl<string | number>(additionalPerson.key),
      id: new FormControl<number>(additionalPerson.id),
      lastname: new FormControl<string>(additionalPerson.lastname, [Validators.required, Validators.maxLength(50)]),
      firstname: new FormControl<string>(additionalPerson.firstname, [Validators.required, Validators.maxLength(50)]),
      birthDate: new FormControl<Date>(additionalPerson.birthDate, [
        Validators.required,
        CustomValidator.minDate(new Date(1920, 0, 1)),
        CustomValidator.maxDate(new Date())
      ]),
      gender: new FormControl<Gender>(additionalPerson.gender, [Validators.required]),
      country: new FormControl<CountryData>(additionalPerson.country, Validators.required),
      employer: new FormControl<string>(additionalPerson.employer),
      income: new FormControl<number>(additionalPerson.income, [Validators.min(1)]),
      incomeDue: new FormControl<Date>(additionalPerson.incomeDue, [
        CustomValidator.minDate(new Date())
      ]),
      excludeFromHousehold: new FormControl<boolean>(additionalPerson.excludeFromHousehold),
      receivesFamilyBonus: new FormControl<boolean>(additionalPerson.receivesFamilyBonus),
    });

    control.get('incomeDue').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
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

  get gender() {
    return this.form.get('gender');
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
    return this.form.get('additionalPersons') as FormArray;
  }

  protected readonly faVenusMars = faVenusMars;
  protected readonly faFlag = faFlag;
  protected readonly faEnvelope = faEnvelope;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faBuilding = faBuilding;
  protected readonly faEuroSign = faEuroSign;
  protected readonly faPhone = faPhone;
}
