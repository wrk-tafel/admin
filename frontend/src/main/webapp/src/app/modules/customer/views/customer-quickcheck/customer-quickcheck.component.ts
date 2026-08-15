import {Component, inject, signal} from '@angular/core';
import {applyEach, form, FormField, required, validate} from '@angular/forms/signals';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDialog} from '@angular/material/dialog';
import {RouterLink} from '@angular/router';
import dayjs from 'dayjs';
import {CustomerApiService, QuickCheckPersonData} from '../../../../api/customer-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {TafelAutofocusDirective} from '../../../../common/directive/tafel-autofocus.directive';
import {TafelInfoTooltipComponent} from '../../../../common/components/tafel-info-tooltip/tafel-info-tooltip.component';
import {visibleErrorMessages} from '../../../../common/util/signal-form-helper';
import {maxDate, min, minDate} from '../../../../common/validator/signal-form-validators';
import {ValidationResultDialogComponent} from '../customer-edit/dialogs/validation-result-dialog.component';

/**
 * Income quick-check: answers "would this household qualify at all?" from nothing but each
 * person's birthdate, income and family-allowance flag - before any of the remaining customer
 * data (names, address, ...) is typed in. The result is the same breakdown dialog "Anspruch
 * prüfen" on the customer form shows.
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
    TafelAutofocusDirective,
    TafelInfoTooltipComponent
  ]
})
export class CustomerQuickCheckComponent {
  private readonly customerApiService = inject(CustomerApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  private formModel = signal<QuickCheckFormModel>({
    persons: [createEmptyPerson()]
  });

  quickCheckForm = form(this.formModel, (schemaPath) => {
    applyEach(schemaPath.persons, (personPath) => {
      required(personPath.birthDate, {message: 'Pflichtfeld'});
      validate(personPath.birthDate, minDate(new Date(1900, 0, 1), {message: 'Datum muss nach dem 01.01.1900 liegen'}));
      validate(personPath.birthDate, maxDate(new Date(), {message: 'Datum darf nicht in der Zukunft liegen'}));

      validate(personPath.income, min(0, {message: 'Einkommen muss mindestens 0 sein'}));
    });
  });

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

    const persons: QuickCheckPersonData[] = this.formModel().persons.map((person, index) => ({
      birthDate: person.birthDate!,
      income: person.income ?? undefined,
      // The first person stands in for the main person, which never contributes a family
      // allowance on the customer form either - its checkbox simply doesn't exist here.
      receivesFamilyAllowance: index === 0 ? false : person.receivesFamilyAllowance
    }));

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
