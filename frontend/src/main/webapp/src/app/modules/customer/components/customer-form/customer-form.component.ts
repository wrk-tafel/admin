import {Component, computed, effect, inject, input, output, signal} from '@angular/core';
import {applyEach, form, FormField, maxLength, required, validate} from '@angular/forms/signals';
import {CountryApiService, CountryData} from '../../../../api/country-api.service';
import {CustomerData, Gender, QuickCheckPersonData} from '../../../../api/customer-api.service';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatIcon} from '@angular/material/icon';
import {TafelInfoTooltipComponent} from '../../../../common/components/tafel-info-tooltip/tafel-info-tooltip.component';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import wcIcon from '@material-symbols/svg-400/outlined/wc-fill.svg';
import flagIcon from '@material-symbols/svg-400/outlined/flag-fill.svg';
import callIcon from '@material-symbols/svg-400/outlined/call-fill.svg';
import mailIcon from '@material-symbols/svg-400/outlined/mail-fill.svg';
import locationOnIcon from '@material-symbols/svg-400/outlined/location_on-fill.svg';
import apartmentIcon from '@material-symbols/svg-400/outlined/apartment-fill.svg';
import {GenderLabelPipe} from '../../../../common/pipes/gender-label.pipe';
import {BirthdateAgePipe} from '../../../../common/pipes/birthdate-age.pipe';
import {visibleErrorMessages} from '../../../../common/util/signal-form-helper';
import {email, maxDate, min, minDate, pattern} from '../../../../common/validator/signal-form-validators';
import {toSignal} from '@angular/core/rxjs-interop';
import dayjs from 'dayjs';

/** +N-month quick-picks next to "Gültig bis", mirroring the customer detail page's prolong menu. */
const VALID_UNTIL_QUICK_PICKS = [1, 2, 3, 6, 12] as const;

/** Map key for the main customer's country autocomplete override - distinct from any person's `key`. */
const MAIN_COUNTRY_KEY = 'main';

@Component({
  selector: 'tafel-customer-form',
  templateUrl: 'customer-form.component.html',
  imports: [
    FormField,
    MatCardModule,
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatIcon,
    TafelAutofocusDirective,
    GenderLabelPipe,
    BirthdateAgePipe,
    TafelInfoTooltipComponent
  ]
})
export class CustomerFormComponent {
  private readonly registerIcons = registerSvgIcons({
    wc: wcIcon,
    flag: flagIcon,
    call: callIcon,
    mail: mailIcon,
    location_on: locationOnIcon,
    apartment: apartmentIcon
  });

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
  /** Whether the operator has actually typed anything - used for the sticky bar's dirty indicator and the unsaved-changes guard. */
  dirty = computed(() => this.customerForm().dirty());
  countries = toSignal(this.countryApiService.getCountries(), {initialValue: [] as CountryData[]});
  genders: Gender[] = [Gender.FEMALE, Gender.MALE];

  /** Keys of the additional-person accordion panels that are currently open. */
  expandedPersonKeys = signal<Set<string | number>>(new Set());

  // Open ranges for the native date pickers, so the widget itself only offers dates the
  // validators above would accept anyway instead of silently rejecting a picked date afterwards.
  protected readonly today = dayjs().format('YYYY-MM-DD');
  protected readonly mainBirthDateMin = '1900-01-01';
  protected readonly personBirthDateMin = '1920-01-01';
  protected readonly validUntilQuickPicks = VALID_UNTIL_QUICK_PICKS;

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

  /**
   * Free-typed override text for a country autocomplete field, keyed by `MAIN_COUNTRY_KEY` or a
   * person's `key` - present only while the user is actively narrowing the list; absent (falling
   * back to the field's currently committed country name) once a selection commits, on blur without
   * one, or on initial load. Keeping this separate from the committed `CountryData | null` value
   * means a half-typed search never overwrites - or gets validated as - the actual selection.
   */
  private readonly countryFilterOverrides = signal<Map<string | number, string>>(new Map());

  mainCountryDisplayText = computed(() =>
    this.countryDisplayText(MAIN_COUNTRY_KEY, this.customerForm.country().value()));
  mainFilteredCountries = computed(() => this.filterCountries(this.mainCountryDisplayText()));

  onMainCountryInput(value: string) {
    this.setCountryFilterOverride(MAIN_COUNTRY_KEY, value);
  }

  onMainCountrySelected(country: CountryData) {
    this.customerForm.country().value.set(country);
    this.setCountryFilterOverride(MAIN_COUNTRY_KEY, null);
  }

  onMainCountryBlur() {
    this.customerForm.country().markAsTouched();
    this.setCountryFilterOverride(MAIN_COUNTRY_KEY, null);
  }

  personCountryDisplayText(index: number): string {
    const person = this.formModel().additionalPersons[index];
    return person ? this.countryDisplayText(person.key, person.country) : '';
  }

  personFilteredCountries(index: number): CountryData[] {
    return this.filterCountries(this.personCountryDisplayText(index));
  }

  onPersonCountryInput(index: number, value: string) {
    const person = this.formModel().additionalPersons[index];
    if (person) {
      this.setCountryFilterOverride(person.key, value);
    }
  }

  onPersonCountrySelected(index: number, country: CountryData) {
    const person = this.formModel().additionalPersons[index];
    if (!person) {
      return;
    }
    this.personField(index).country().value.set(country);
    this.setCountryFilterOverride(person.key, null);
  }

  onPersonCountryBlur(index: number) {
    const person = this.formModel().additionalPersons[index];
    if (!person) {
      return;
    }
    this.personField(index).country().markAsTouched();
    this.setCountryFilterOverride(person.key, null);
  }

  private countryDisplayText(key: string | number, committed: CountryData | null): string {
    return this.countryFilterOverrides().get(key) ?? (committed?.name ?? '');
  }

  private filterCountries(text: string): CountryData[] {
    const term = text.trim().toLowerCase();
    return term ? this.countries().filter(country => country.name.toLowerCase().includes(term)) : this.countries();
  }

  private setCountryFilterOverride(key: string | number, value: string | null) {
    this.countryFilterOverrides.update(map => {
      const next = new Map(map);
      if (value === null) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    });
  }

  personField(index: number) {
    return this.customerForm.additionalPersons[index]!;
  }

  isPersonExpanded(key: string | number): boolean {
    return this.expandedPersonKeys().has(key);
  }

  togglePersonPanel(key: string | number, expanded: boolean) {
    this.expandedPersonKeys.update(keys => {
      const next = new Set(keys);
      if (expanded) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  personSummaryFlags(person: AdditionalPersonFormItem): string[] {
    const flags: string[] = [];
    if (person.receivesFamilyAllowance) {
      flags.push('Familienbeihilfe');
    }
    if (person.excludeFromHousehold) {
      flags.push('Nicht im selben Haushalt');
    }
    return flags;
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
    // Adding a person is itself a change worth protecting, even before any of its fields are typed into.
    this.customerForm().markAsDirty();

    // Only the newly-added person starts open, so a form with several people already reviewed
    // doesn't reopen all of them every time one more is added.
    this.expandedPersonKeys.set(new Set([newPerson.key]));
  }

  removePerson(index: number) {
    const removedKey = this.formModel().additionalPersons[index]?.key;
    this.formModel.update(model => ({
      ...model,
      additionalPersons: model.additionalPersons.filter((_, i) => i !== index)
    }));
    this.customerForm().markAsDirty();
    if (removedKey !== undefined) {
      this.togglePersonPanel(removedKey, false);
      this.setCountryFilterOverride(removedKey, null);
    }
  }

  applyValidUntilQuickPick(months: number) {
    const current = this.customerForm.validUntil().value();
    const base = current ? dayjs(current) : dayjs();
    this.customerForm.validUntil().value.set(base.add(months, 'months').endOf('day').toDate());
  }

  markAllAsTouched() {
    // markAsTouched() cascades to all descendant fields, including additionalPersons entries
    this.customerForm().markAsTouched();
  }

  /**
   * Prefills first/last name on an otherwise-empty form - used when arriving at "Kunden anlegen"
   * from a customer search that found nothing, so the search terms are not typed twice. A no-op for
   * whichever field is not provided, so a surname-only prefill does not clear an empty first name
   * back to itself for no reason.
   */
  prefillNames(firstname: string | null, lastname: string | null) {
    if (!firstname && !lastname) {
      return;
    }
    this.formModel.update(model => ({
      ...model,
      firstname: firstname ?? model.firstname,
      lastname: lastname ?? model.lastname,
    }));
  }

  /**
   * Prefills the persons handed over from the Anspruch-Schnellcheck screen on an otherwise-empty
   * form: the first person's birthdate and income land on the main person, every further one
   * becomes an additional person with its birthdate, income and family-allowance flag. Names and
   * the other identity fields remain to be filled in.
   */
  prefillQuickCheckPersons(persons: QuickCheckPersonData[]) {
    if (!persons.length) {
      return;
    }
    const [mainPerson, ...additionalPersons] = persons;
    this.formModel.update(model => ({
      ...model,
      birthDate: mainPerson.birthDate ?? model.birthDate,
      income: mainPerson.income ?? model.income,
      additionalPersons: additionalPersons.map(person => ({
        key: crypto.randomUUID(),
        id: null,
        firstname: '',
        lastname: '',
        birthDate: person.birthDate ?? null,
        gender: null,
        country: null,
        employer: '',
        income: person.income ?? null,
        incomeDue: null,
        excludeFromHousehold: false,
        receivesFamilyAllowance: person.receivesFamilyAllowance
      }))
    }));
  }

  // Expose utility functions for template use
  protected readonly visibleErrorMessages = visibleErrorMessages;

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
