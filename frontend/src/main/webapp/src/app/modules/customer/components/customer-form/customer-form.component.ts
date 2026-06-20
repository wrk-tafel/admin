import {Component, computed, effect, inject, input, output, signal, ChangeDetectionStrategy} from '@angular/core';
import {applyEach, form, FormField, maxLength, required, validate} from '@angular/forms/signals';
import {CountryApiService, CountryData} from '../../../../api/country-api.service';
import {CustomerAddPersonData, CustomerData, Gender} from '../../../../api/customer-api.service';
import {CommonModule} from '@angular/common';
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
import {getErrorMessages, shouldShowErrors} from '../../../../common/util/signal-form-helper';
import {email, maxDate, min, minDate, pattern} from '../../../../common/validator/signal-form-validators';
import {toSignal} from '@angular/core/rxjs-interop';
import moment from 'moment';

@Component({
  selector: 'tafel-customer-form',
  templateUrl: 'customer-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormField,
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
    validate(schemaPath.birthDate, minDate(new Date(1900, 0, 1), {message: 'Datum muss nach dem 01.01.1900 liegen'}) as any);
        validate(schemaPath.birthDate, maxDate(new Date(), {message: 'Datum darf nicht in der Zukunft liegen'}) as any);

    required(schemaPath.gender, {message: 'Pflichtfeld'});

    required(schemaPath.country, {message: 'Pflichtfeld'});

    required(schemaPath.telephoneNumber, {message: 'Pflichtfeld'});
    validate(schemaPath.telephoneNumber, pattern('^[0-9]*$', {message: 'Nur Ziffern erlaubt'}) as any);

    maxLength(schemaPath.email as any, 100, {message: 'E-Mail zu lang (maximal 100 Zeichen)'});
    validate(schemaPath.email as any, email({message: 'E-Mail-Format ungültig'}) as any);

    // Address fields
    required(schemaPath.address.street, {message: 'Pflichtfeld'});
    maxLength(schemaPath.address.street, 100, {message: 'Straße zu lang (maximal 100 Zeichen)'});

    required(schemaPath.address.houseNumber, {message: 'Pflichtfeld'});
    maxLength(schemaPath.address.houseNumber, 10, {message: 'Hausnummer zu lang (maximal 10 Zeichen)'});

    required(schemaPath.address.postalCode, {message: 'Pflichtfeld'});
    validate(schemaPath.address.postalCode, pattern('^[0-9]{4}$', {message: 'Postleitzahl muss 4 Ziffern haben'}) as any);

    required(schemaPath.address.city, {message: 'Pflichtfeld'});
    maxLength(schemaPath.address.city, 50, {message: 'Stadt zu lang (maximal 50 Zeichen)'});

    // Employment fields
    required(schemaPath.employer, {message: 'Pflichtfeld'});

    validate(schemaPath.income, min(0, {message: 'Einkommen muss mindestens 0 sein'}) as any);

    validate(schemaPath.incomeDue, minDate(new Date(), {message: 'Datum muss in der Zukunft liegen'}) as any);

    required(schemaPath.validUntil, {message: 'Pflichtfeld'});
    validate(schemaPath.validUntil, minDate(new Date(), {message: 'Datum muss in der Zukunft liegen'}) as any);

    // Additional persons validation using applyEach
    applyEach(schemaPath.additionalPersons as any, (personPath: any) => {
      required(personPath.lastname, {message: 'Pflichtfeld'});
      maxLength(personPath.lastname, 50, {message: 'Nachname zu lang (maximal 50 Zeichen)'});

      required(personPath.firstname, {message: 'Pflichtfeld'});
      maxLength(personPath.firstname, 50, {message: 'Vorname zu lang (maximal 50 Zeichen)'});

      required(personPath.birthDate, {message: 'Pflichtfeld'});
      validate(personPath.birthDate, minDate(new Date(1920, 0, 1), {message: 'Datum muss nach dem 01.01.1920 liegen'}) as any);
      validate(personPath.birthDate, maxDate(new Date(), {message: 'Datum darf nicht in der Zukunft liegen'}) as any);

      required(personPath.gender, {message: 'Pflichtfeld'});
      required(personPath.country, {message: 'Pflichtfeld'});

      validate(personPath.income, min(0, {message: 'Einkommen muss mindestens 0 sein'}) as any);
      validate(personPath.incomeDue, minDate(new Date(), {message: 'Datum muss in der Zukunft liegen'}) as any);
    });
  });

  valid = computed(() => this.customerForm().valid());
  countries = toSignal<CountryData[]>(this.countryApiService.getCountries());
  genders: Gender[] = [Gender.FEMALE, Gender.MALE];

  // Derived customer data from form model
  private derivedFormData = computed(() => {
    const formValue = this.formModel();
    return formValue as CustomerData;
  });

  // Helper to satisfy template formField type expectations for potentially nullable fields during migration
  // Return the raw form field as any for template binding until typings are reconciled
  get emailFormField(): any {
    return this.customerForm.email as any;
  }

  // Helper wrappers for template usage to avoid deep typing issues during migration
  emailShouldShowErrors(): boolean {
    return shouldShowErrors(this.customerForm.email());
  }

  emailErrorMessages(): string[] {
    return getErrorMessages(this.customerForm.email());
  }

  emailIsValidAndTouched(): boolean {
    const field = this.customerForm.email();
    return field.valid() && (field.dirty() || field.touched());
  }

  constructor() {
    // Populate form when customerData changes
    effect(() => {
      const customerData = this.customerData();
      if (customerData) {
        // Update main form model including additional persons
        const additionalPersonsData = (customerData.additionalPersons ?? []).map((person) => ({
          ...person,
          key: person.key ? person.key : crypto.randomUUID(),
          employer: person.employer ?? '',
          income: person.income ?? undefined,
          incomeDue: person.incomeDue ?? undefined,
        }));

        this.formModel.set({
          id: customerData.id ?? null,
          lastname: customerData.lastname ?? '',
          firstname: customerData.firstname ?? '',
          birthDate: customerData.birthDate ?? null,
          gender: customerData.gender ?? null,
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
          additionalPersons: additionalPersonsData as any
        });
      }
    });

    // Auto-fill validUntil when incomeDue changes
    effect(() => {
      const incomeDue = this.customerForm.incomeDue().value();
      if (incomeDue) {
        const validUntilDate = moment(incomeDue).add(2, 'months').toDate();
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

  onCountryChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const selectedId = select.value;
    const country = (this.countries() ?? []).find(c => c.id.toString() === selectedId);
    this.customerForm.country().value.set(country ?? null);
    this.customerForm.country().markAsTouched();
  }

  onGenderChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const selectedGender = select.value as Gender;
    this.customerForm.gender().value.set(selectedGender || null);
    this.customerForm.gender().markAsTouched();
  }

  onPersonCountryChange(index: number, event: Event) {
    const select = event.target as HTMLSelectElement;
    const selectedId = select.value;
    const country = (this.countries() ?? []).find(c => c.id.toString() === selectedId);

    const anyForm = this.customerForm as any;
    anyForm.additionalPersons[index].country().value.set(country ?? null);
    anyForm.additionalPersons[index].country().markAsTouched();
  }

  onPersonGenderChange(index: number, event: Event) {
    const select = event.target as HTMLSelectElement;
    const selectedGender = select.value as Gender;

    const anyForm = this.customerForm as any;
    anyForm.additionalPersons[index].gender().value.set(selectedGender || null);
    anyForm.additionalPersons[index].gender().markAsTouched();
  }

  onPersonGenderBlur(index: number) {
    const anyForm = this.customerForm as any;
    anyForm.additionalPersons[index].gender().markAsTouched();
  }

  onPersonCountryBlur(index: number) {
    const anyForm = this.customerForm as any;
    anyForm.additionalPersons[index].country().markAsTouched();
  }

  addNewPerson() {
    const newPerson: AdditionalPersonFormItem = {
      key: crypto.randomUUID(),
      id: 0,
      firstname: '',
      lastname: '',
      // optional fields left undefined where allowed
      birthDate: undefined as any,
      gender: undefined as any,
      country: undefined as any,
      employer: '',
      income: undefined as any,
      incomeDue: undefined as any,
      excludeFromHousehold: false,
      receivesFamilyBonus: true
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
    // Mark all signal form fields as touched
    this.customerForm.lastname().markAsTouched();
    this.customerForm.firstname().markAsTouched();
    this.customerForm.birthDate().markAsTouched();
    this.customerForm.gender().markAsTouched();
    this.customerForm.country().markAsTouched();
    this.customerForm.telephoneNumber().markAsTouched();
    this.customerForm.email().markAsTouched();
    this.customerForm.address.street().markAsTouched();
    this.customerForm.address.houseNumber().markAsTouched();
    this.customerForm.address.stairway().markAsTouched();
    this.customerForm.address.door().markAsTouched();
    this.customerForm.address.postalCode().markAsTouched();
    this.customerForm.address.city().markAsTouched();
    this.customerForm.employer().markAsTouched();
    this.customerForm.income().markAsTouched();
    this.customerForm.incomeDue().markAsTouched();
    this.customerForm.validUntil().markAsTouched();

    // Mark all additional persons fields as touched using bracket notation
    const additionalPersons = this.formModel().additionalPersons;
    for (let i = 0; i < additionalPersons.length; i++) {
      const anyForm = this.customerForm as any;
      anyForm.additionalPersons[i].lastname().markAsTouched();
      anyForm.additionalPersons[i].firstname().markAsTouched();
      anyForm.additionalPersons[i].birthDate().markAsTouched();
      anyForm.additionalPersons[i].gender().markAsTouched();
      anyForm.additionalPersons[i].country().markAsTouched();
      anyForm.additionalPersons[i].employer().markAsTouched();
      anyForm.additionalPersons[i].income().markAsTouched();
      anyForm.additionalPersons[i].incomeDue().markAsTouched();
    }
  }

  // Expose utility functions for template use
  protected readonly getErrorMessages = getErrorMessages;
  protected readonly shouldShowErrors = shouldShowErrors;

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
  email: string | null;
  address: AddressFormModel;
  employer: string;
  income: number | null;
  incomeDue: Date | null;
  validUntil: Date | null;
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

export interface AdditionalPersonFormItem extends CustomerAddPersonData {
  key: string | number;
}
