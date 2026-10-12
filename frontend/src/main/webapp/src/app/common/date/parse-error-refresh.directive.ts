import {Directive, forwardRef} from '@angular/core';
import {NG_VALIDATORS, ValidationErrors, Validator} from '@angular/forms';

/**
 * Makes a signal form notice that a date or time field holds text it cannot read.
 *
 * `matDatepicker` reports unreadable text through its own validator, and tells the form to look
 * again only by handing it the value once more - which stays `null` from one unreadable keystroke
 * to the next, so a signal form has nothing to react to and keeps the answer it computed while the
 * field was still empty. This validator never fails itself; being asked to re-validate on every
 * keystroke is all it is for, and that re-runs the field's own validators along with it.
 *
 * Needed wherever a `matDatepicker` or `matTimepicker` input is bound with `[formField]` - a
 * component has to list it in its `imports` next to the picker.
 */
@Directive({
  // Matches the picker's own attributes on purpose: the field gets this by being what it is, with
  // no extra `tafel...` attribute a new date field could be written without.
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'input[matDatepicker][formField], input[matTimepicker][formField]',
  host: {'(input)': 'onValidatorChange()'},
  providers: [{provide: NG_VALIDATORS, useExisting: forwardRef(() => ParseErrorRefreshDirective), multi: true}]
})
export class ParseErrorRefreshDirective implements Validator {

  protected onValidatorChange: () => void = () => {};

  validate(): ValidationErrors | null {
    return null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

}
