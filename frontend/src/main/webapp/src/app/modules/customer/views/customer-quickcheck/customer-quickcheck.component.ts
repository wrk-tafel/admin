import {Component, computed, inject, signal} from '@angular/core';
import {toObservable, toSignal} from '@angular/core/rxjs-interop';
import {applyEach, form, FormField, required, validate} from '@angular/forms/signals';
import {catchError, debounceTime, filter, map, switchMap} from 'rxjs/operators';
import {of} from 'rxjs';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDialog} from '@angular/material/dialog';
import {RouterLink} from '@angular/router';
import {CurrencyPipe, NgClass} from '@angular/common';
import dayjs from 'dayjs';
import {CustomerApiService, QuickCheckPersonData, ValidateCustomerResponse} from '../../../../api/customer-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {TafelInfoTooltipComponent} from '../../../../common/components/tafel-info-tooltip/tafel-info-tooltip.component';
import {SUPPRESS_ERROR_TOAST_CONTEXT} from '../../../../common/http/suppress-error-toast.token';
import {visibleErrorMessages} from '../../../../common/util/signal-form-helper';
import {maxDate, min, minDate} from '../../../../common/validator/signal-form-validators';
import {ValidationResultDialogComponent} from '../customer-edit/dialogs/validation-result-dialog.component';

/**
 * Income quick-check: answers "would this household qualify at all?" from nothing but each
 * person's birthdate, income and family-allowance flag - before any of the remaining customer
 * data (names, address, ...) is typed in. Mirrors the customer form's eligibility surfaces: the
 * same live summary banner while entering, and the same breakdown dialog behind "Anspruch
 * prüfen". "Kunden anlegen" hands the entered persons over to the customer form so they are not
 * typed twice.
 */
@Component({
  selector: 'tafel-customer-quickcheck',
  templateUrl: 'customer-quickcheck.component.html',
  imports: [
    FormField,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    RouterLink,
    CurrencyPipe,
    NgClass,
    TafelAutofocusDirective,
    TafelInfoTooltipComponent
  ],
  // Fills the height the layout gives the screen, so the sticky action bar rests at the bottom
  // of the viewport even while the form is still short - same pattern as the dashboard.
  host: {class: 'flex flex-1 flex-col'}
})
export class CustomerQuickCheckComponent {
  private readonly customerApiService = inject(CustomerApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  // Three persons up front - the typical household - so most checks need no "Hinzufügen" first.
  // Rows left empty simply stay out of the check.
  private formModel = signal<QuickCheckFormModel>({
    persons: [createEmptyPerson(), createEmptyPerson(true), createEmptyPerson(true)]
  });

  quickCheckForm = form(this.formModel, (schemaPath) => {
    applyEach(schemaPath.persons, (personPath) => {
      // An empty row is fine (it is not part of the check), but an income without a birthdate
      // would silently be dropped from the calculation - so the birthdate becomes required as
      // soon as an income is entered.
      required(personPath.birthDate, {
        message: 'Pflichtfeld',
        when: (ctx) => ctx.valueOf(personPath.income) != null
      });
      validate(personPath.birthDate, minDate(new Date(1900, 0, 1), {message: 'Datum muss nach dem 01.01.1900 liegen'}));
      validate(personPath.birthDate, maxDate(new Date(), {message: 'Datum darf nicht in der Zukunft liegen'}));

      validate(personPath.income, min(0, {message: 'Einkommen muss mindestens 0 sein'}));
    });
  });

  /**
   * Live eligibility preview, mirroring the customer form's: re-runs the same quick-check call
   * "Anspruch prüfen" uses, debounced, as soon as at least one person has a birthdate - persons
   * still missing theirs are left out of the request rather than blocking the preview. Errors
   * (e.g. an unconfigured household composition) are swallowed here - "Anspruch prüfen" is still
   * the place that surfaces those.
   */
  readonly liveEligibility = toSignal(
    toObservable(this.formModel).pipe(
      debounceTime(600),
      map(model => this.mapToRequestPersons(model.persons)),
      filter(persons => persons.length > 0),
      switchMap(persons => this.customerApiService.quickCheck(persons, SUPPRESS_ERROR_TOAST_CONTEXT).pipe(
        catchError(() => of(null))
      ))
    ),
    {initialValue: null as ValidateCustomerResponse | null}
  );

  readonly liveEligibilityPersonCount = computed(() => this.mapToRequestPersons(this.formModel().persons).length);

  /**
   * Navigation state for the "Kunden anlegen" link: the persons as entered so far, picked up by
   * the customer form so birthdates and incomes are not typed twice.
   */
  readonly createCustomerState = computed(() => ({quickCheckPersons: this.mapToRequestPersons(this.formModel().persons)}));

  // Open range for the native date pickers, mirroring the customer form's birthdate bounds.
  protected readonly today = dayjs().format('YYYY-MM-DD');
  protected readonly birthDateMin = '1900-01-01';

  personField(index: number) {
    return this.quickCheckForm.persons[index]!;
  }

  addPerson() {
    // Added persons default to receiving family allowance, mirroring the customer form's
    // "Weitere Personen" - the typical person added there is a child.
    this.formModel.update(model => ({
      persons: [...model.persons, createEmptyPerson(true)]
    }));
  }

  removePerson(index: number) {
    this.formModel.update(model => ({
      persons: model.persons.filter((_, i) => i !== index)
    }));
  }

  check() {
    this.quickCheckForm().markAsTouched();
    if (!this.quickCheckForm().valid()) {
      this.toastr.error('Bitte Eingaben überprüfen!');
      return;
    }

    const persons = this.mapToRequestPersons(this.formModel().persons);
    if (persons.length === 0) {
      this.toastr.error('Bitte mindestens ein Geburtsdatum erfassen!');
      return;
    }

    this.customerApiService.quickCheck(persons).subscribe({
      next: (result) => {
        this.dialog.open(ValidationResultDialogComponent, {
          data: {validationResult: result}
        });
      },
      // the interceptor's error toast is the whole presentation an error (e.g. a household
      // composition with no configured income limit) needs - without this callback the rethrown
      // HttpErrorResponse would escape as an uncaught application error
      error: () => {
      }
    });
  }

  /**
   * The wire shape of the entered persons, dropping any still missing their birthdate first so
   * the index-0 special case below lands on the person that actually ends up first in the
   * resulting list. That first person stands in for the main person, which never contributes a
   * family allowance on the customer form either - its checkbox simply doesn't exist here.
   */
  private mapToRequestPersons(persons: QuickCheckPersonFormItem[]): QuickCheckPersonData[] {
    return persons
      .filter((person): person is QuickCheckPersonFormItem & {birthDate: Date} => !!person.birthDate)
      .map((person, index): QuickCheckPersonData => ({
        birthDate: person.birthDate,
        income: person.income ?? undefined,
        receivesFamilyAllowance: index === 0 ? false : person.receivesFamilyAllowance
      }));
  }

  protected readonly visibleErrorMessages = visibleErrorMessages;
}

function createEmptyPerson(receivesFamilyAllowance = false): QuickCheckPersonFormItem {
  return {
    key: crypto.randomUUID(),
    birthDate: null,
    income: null,
    receivesFamilyAllowance
  };
}

export interface QuickCheckFormModel {
  persons: QuickCheckPersonFormItem[];
}

export interface QuickCheckPersonFormItem {
  key: string;
  birthDate: Date | null;
  income: number | null;
  receivesFamilyAllowance: boolean;
}
