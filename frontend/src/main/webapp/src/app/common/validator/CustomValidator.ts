import {AbstractControl, ValidationErrors, ValidatorFn} from '@angular/forms';
import dayjs from 'dayjs';

/**
 * Custom validators for classic `ReactiveFormsModule`/`FormBuilder` forms - the `AbstractControl`
 * equivalent of `common/validator/signal-form-validators.ts`, which targets the newer
 * `@angular/forms/signals` API instead. Keep both in sync if you change validation behavior that
 * exists in each (e.g. `minDate`/`maxDate`).
 */
export class CustomValidator {

  static minDate(date: Date): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value == null) {
        return null;
      }

      const controlDate = dayjs(control.value).startOf('day');
      if (!controlDate.isValid()) {
        return null;
      }

      const validationDate = dayjs(date).startOf('day');

      return !controlDate.isBefore(validationDate) ? null : {
        'mindate': {
          'minimumDate': validationDate.format('DD.MM.YYYY'),
          'actualDate': controlDate.format('DD.MM.YYYY')
        }
      };
    };
  }

  static maxDate(date: Date): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value == null) {
        return null;
      }

      const controlDate = dayjs(control.value).startOf('day');
      if (!controlDate.isValid()) {
        return null;
      }

      const validationDate = dayjs(date).startOf('day');

      return !controlDate.isAfter(validationDate) ? null : {
        'maxdate': {
          'maximumDate': validationDate.format('DD.MM.YYYY'),
          'actualDate': controlDate.format('DD.MM.YYYY')
        }
      };
    };
  }

  /**
   * Validates the control's value indirectly through `callback()` rather than the value itself -
   * for a text field that drives a search/lookup elsewhere, where typing something isn't enough,
   * a match must actually have been resolved. An empty control is always valid (use `required`
   * separately if the field is mandatory); once it has text, `callback()` must be truthy or the
   * control is marked invalid with `message`. Typical use: `hasValue(() => this.selectedEntity(),
   * ...)` on a search-input control, so the input itself shows invalid until a lookup elsewhere
   * has actually resolved a match, not just once text was typed into it.
   */
  static hasValue(callback: () => any, message: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => !control.value || callback() ? null : {
        'hasValue': {
          'message': message
        }
      };
  }

}
