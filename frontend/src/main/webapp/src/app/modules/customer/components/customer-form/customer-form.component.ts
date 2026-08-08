import {Component, computed, effect, inject, input, output, signal} from '@angular/core';
import {applyEach, form, FormField, maxLength, required, validate} from '@angular/forms/signals';
import {CountryApiService, CountryData} from '../../../../api/country-api.service';
import {CustomerData, Gender} from '../../../../api/customer-api.service';
import {CommonModule} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatIcon} from '@angular/material/icon';
import {TafelInfoTooltipComponent} from '../../../../common/components/tafel-info-tooltip/tafel-info-tooltip.component';
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
import {visibleErrorMessages} from '../../../../common/util/signal-form-helper';
import {email, maxDate, min, minDate, pattern} from '../../../../common/validator/signal-form-validators';
import {toSignal} from '@angular/core/rxjs-interop';
import dayjs from 'dayjs';

@Component({
  selector: 'tafel-customer-form',
  templateUrl: 'customer-form.component.html',
  imports: [
    FormField,
    MatCardModule,
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIcon,
    FaIconComponent,
    TafelAutofocusDirective,
    GenderLabelPipe,
    TafelInfoTooltipComponent
  ]
})
export class CustomerFormComponent {
  editMode = input(false);
  customerData = input<CustomerData>();
  customerDataChange = output<CustomerData>();

  private readonly countryApiService = inject(CountryApiService);

  // Signal for form model
  private formModel = signal<CustomerFormModel>({
    id: null,
    lastname: '',
    firstname: '',
    birthDate: null,
    gender: null,
    country: null,
    telephoneNumber: '',
    email: '',
    address: {
      street: '',
      houseNumber: '',
      stairway: null,
      door: null,
      postalCode: null,
      city: ''
    },
    employer: '',
    income: null,
    incomeDue: null,
    validUntil: null,
    singleParent: false,
    additionalPersons: []
  });

  // Create signal form with validation schema
  customerForm = form(this.formModel, (schemaPath) => {
    // Main customer fields
    required(schemaPath.lastname, {message: 'Pflichtfeld'});
    maxLength(schemaPath.lastname, 50, {message: 'Nachname zu lang (maximal 50 Zeichen)'});

    required(schemaPath.firstname, {message: 'Pflichtfeld'});
    maxLength(schemaPath.firstname, 50, {message: 'Vorname zu lang (maximal 50 Zeichen)'});

    required(schemaPath.birthDate, {message: 'Pflichtfeld'});
    validate(schemaPath.birthDate, minDate(new Date(1900, 0, 1), {message: 'Datum muss nach dem 01.01.1900 liegen'}));
    validate(schemaPath.birthDate, maxDate(new Date(), {message: 'Datum darf nicht in der Zukunft liegen'}));

    required(schemaPath.gender, {message: 'Pflichtfeld'});

    required(schemaPath.country, {message: 'Pflichtfeld'});

    required(schemaPath.telephoneNumber, {message: 'Pflichtfeld'});
    validate(schemaPath.telephoneNumber, pattern('^[0-9]*$', {message: 'Nur Ziffern erlaubt'}));

    maxLength(schemaPath.email, 100, {message: 'E-Mail zu lang (maximal 100 Zeichen)'});
    validate(schemaPath.email, email({message: 'E-Mail-Format ungültig'}));

    // Address fields
    required(schemaPath.address.street, {message: 'Pflichtfeld'});
    maxLength(schemaPath.address.street, 100, {message: 'Straße zu lang (maximal 100 Zeichen)'});

    required(schemaPath.address.houseNumber, {message: 'Pflichtfeld'});
    maxLength(schemaPath.address.houseNumber, 10, {message: 'Hausnummer zu lang (maximal 10 Zeichen)'});

    required(schemaPath.address.postalCode, {message: 'Pflichtfeld'});
    validate(schemaPath.address.postalCode, pattern('^[0-9]{4}$', {message: 'Postleitzahl muss 4 Ziffern haben'}));

    required(schemaPath.address.city, {message: 'Pflichtfeld'});
    maxLength(schemaPath.address.city, 50, {message: 'Stadt zu lang (maximal 50 Zeichen)'});

    // Employment fields
    required(schemaPath.employer, {message: 'Pflichtfeld'});

    validate(schemaPath.income, min(0, {message: 'Einkommen muss mindestens 0 sein'}));

    validate(schemaPath.incomeDue, minDate(new Date(), {message: 'Datum muss in der Zukunft liegen'}));

    required(schemaPath.validUntil, {message: 'Pflichtfeld'});
    validate(schemaPath.validUntil, minDate(new Date(), {message: 'Datum muss in der Zukunft liegen'}));

    // Additional persons validation using applyEach
    applyEach(schemaPath.additionalPersons, (personPath) => {
      required(personPath.lastname, {message: 'Pflichtfeld'});
      maxLength(personPath.lastname, 50, {message: 'Nachname zu lang (maximal 50 Zeichen)'});

      required(personPath.firstname, {message: 'Pflichtfeld'});
      maxLength(personPath.firstname, 50, {message: 'Vorname zu lang (maximal 50 Zeichen)'});

      required(personPath.birthDate, {message: 'Pflichtfeld'});
      validate(personPath.birthDate, minDate(new Date(1920, 0, 1), {message: 'Datum muss nach dem 01.01.1920 liegen'}));
      validate(personPath.birthDate, maxDate(new Date(), {message: 'Datum darf nicht in der Zukunft liegen'}));

      required(personPath.gender, {message: 'Pflichtfeld'});
      required(personPath.country, {message: 'Pflichtfeld'});

      validate(personPath.income, min(0, {message: 'Einkommen muss mindestens 0 sein'}));
      validate(personPath.incomeDue, minDate(new Date(), {message: 'Datum muss in der Zukunft liegen'}));
    });
  });

  valid = computed(() => this.customerForm().valid());
  countries = toSignal(this.countryApiService.getCountries(), {initialValue: [] as CountryData[]});
  genders: Gender[] = [Gender.FEMALE, Gender.MALE];

  // Derived customer data from form model
  private derivedFormData = computed(() => {
    const formValue = this.formModel();
    return formValue as CustomerData;
  });

  constructor() {
    // Populate form when customerData changes
    effect(() => {
      const customerData = this.customerData();
      if (customerData) {
        // Update main form model including additional persons
        const additionalPersonsData = (customerData.additionalPersons ?? []).map((person) => ({
          ...person,
          key: person.key ? person.key : crypto.randomUUID(),
          birthDate: person.birthDate ?? null,
          gender: person.gender ?? null,
          country: person.country ?? null,
          employer: person.employer ?? '',
          income: person.income ?? null,
          incomeDue: person.incomeDue ?? null,
        }));

        this.formModel.set({
          id: customerData.id ?? null,
          lastname: customerData.lastname ?? '',
          firstname: customerData.firstname ?? '',
          birthDate: customerData.birthDate ?? null,
          gender: customerData.gender,
          country: customerData.country ?? null,
          telephoneNumber: customerData.telephoneNumber ?? '',
          email: customerData.email ?? '',
          address: {
            street: customerData.address?.street ?? '',
            houseNumber: customerData.address?.houseNumber ?? '',
            stairway: customerData.address?.stairway ?? null,
            door: customerData.address?.door ?? null,
            postalCode: customerData.address?.postalCode ?? null,
            city: customerData.address?.city ?? ''
          },
          employer: customerData.employer ?? '',
          income: customerData.income ?? null,
          incomeDue: customerData.incomeDue ?? null,
          validUntil: customerData.validUntil ?? null,
          singleParent: customerData.singleParent ?? false,
          additionalPersons: additionalPersonsData
        });
      }
    });

    // Auto-fill validUntil when incomeDue changes
    effect(() => {
      const incomeDue = this.customerForm.incomeDue().value();
      if (incomeDue) {
        const validUntilDate = dayjs(incomeDue).add(2, 'months').toDate();
        this.customerForm.validUntil().value.set(validUntilDate);
      }
    });

    // Emit form changes
    effect(() => {
      const formData = this.derivedFormData();
      if (formData) {
        this.customerDataChange.emit(formData);
      }
    });
  }

  compareCountry(a: CountryData | null, b: CountryData | null): boolean {
    return a?.id === b?.id;
  }

  personField(index: number) {
    return this.customerForm.additionalPersons[index]!;
  }

  addNewPerson() {
    const newPerson: AdditionalPersonFormItem = {
      key: crypto.randomUUID(),
      id: null,
      firstname: '',
      lastname: '',
      birthDate: null,
      gender: null,
      country: null,
      employer: '',
      income: null,
      incomeDue: null,
      excludeFromHousehold: false,
      receivesFamilyAllowance: true
    };

    // Update the form model's additionalPersons array
    this.formModel.update(model => ({
      ...model,
      additionalPersons: [...model.additionalPersons, newPerson]
    }));
  }

  removePerson(index: number) {
    this.formModel.update(model => ({
      ...model,
      additionalPersons: model.additionalPersons.filter((_, i) => i !== index)
    }));
  }

  markAllAsTouched() {
    // markAsTouched() cascades to all descendant fields, including additionalPersons entries
    this.customerForm().markAsTouched();
  }

  // Expose utility functions for template use
  protected readonly visibleErrorMessages = visibleErrorMessages;

  protected readonly faVenusMars = faVenusMars;
  protected readonly faFlag = faFlag;
  protected readonly faEnvelope = faEnvelope;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faBuilding = faBuilding;
  protected readonly faEuroSign = faEuroSign;
  protected readonly faPhone = faPhone;
}

export interface CustomerFormModel {
  id: number | null;
  lastname: string;
  firstname: string;
  birthDate: Date | null;
  gender: Gender | null;
  country: CountryData | null;
  telephoneNumber: string;
  email: string;
  address: AddressFormModel;
  employer: string;
  income: number | null;
  incomeDue: Date | null;
  validUntil: Date | null;
  singleParent: boolean;
  additionalPersons: AdditionalPersonFormItem[];
}

export interface AddressFormModel {
  street: string;
  houseNumber: string;
  stairway: string | null;
  door: string | null;
  postalCode: number | null;
  city: string;
}

export interface AdditionalPersonFormItem {
  key: string | number;
  id: number | null;
  firstname: string;
  lastname: string;
  birthDate: Date | null;
  gender: Gender | null;
  country: CountryData | null;
  employer: string;
  income: number | null;
  incomeDue: Date | null;
  excludeFromHousehold: boolean;
  receivesFamilyAllowance: boolean;
}
