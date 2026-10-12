import {FieldState} from '@angular/forms/signals';

/**
 * Utility functions for working with Angular Signal Forms
 */

/**
 * Get error messages for a field to display in the template
 *
 * @param fieldState The field state from a signal form
 * @returns Array of error messages to display
 *
 * @example
 * ```typescript
 * // In component
 * getErrorMessages(this.userForm.username())
 * ```
 *
 * @example
 * ```html
 * <!-- In template -->
 * @for (errorMessage of getErrorMessages(userForm.username()); track errorMessage) {
 *   <div class="invalid-feedback">{{errorMessage}}</div>
 * }
 * ```
 */
export function getErrorMessages(fieldState: FieldState<any>): string[] {
  const errors = fieldState.errors();
  if (!errors || errors.length === 0) {
    return [];
  }

  // Text a date or time field cannot read leaves the field's value empty, so `required` would
  // report "Pflichtfeld" for a field somebody did fill in - the parse error is the whole story.
  const parseMessages = errors.map((error: any) => PARSE_ERROR_MESSAGES[error.kind]).filter((message: string) => message);
  if (parseMessages.length > 0) {
    return parseMessages;
  }

  return errors.map((error: any) => error.message).filter((message: string) => message);
}

/**
 * The errors `matDatepicker` and `matTimepicker` report themselves when they cannot read what was
 * typed. They reach a signal form without a message, since they come from the control rather than
 * from the form's schema.
 */
const PARSE_ERROR_MESSAGES: Record<string, string> = {
  matDatepickerParse: 'Ungültiges Datum (TT.MM.JJJJ)',
  matTimepickerParse: 'Ungültige Uhrzeit (HH:MM)'
};

/**
 * Check if a field should show errors (has errors and is touched)
 *
 * Only gates on `touched()` (set on blur) rather than `dirty()` so errors don't
 * flash while the user is still typing - the signal-forms equivalent of `updateOn: 'blur'`.
 *
 * @param fieldState The field state from a signal form
 * @returns True if the field has errors and should display them
 *
 * @example
 * ```typescript
 * // In component
 * shouldShowErrors(this.userForm.username())
 * ```
 *
 * @example
 * ```html
 * <!-- In template -->
 * <input [ngClass]="{'is-invalid': shouldShowErrors(userForm.username()), ...}">
 * @if (shouldShowErrors(userForm.username())) {
 *   <div class="invalid-feedback">Error message</div>
 * }
 * ```
 */
export function shouldShowErrors(fieldState: FieldState<any>): boolean {
  return !fieldState.valid() && fieldState.touched();
}

/**
 * Get the error messages that should currently be displayed for a field.
 *
 * Combines {@link shouldShowErrors} and {@link getErrorMessages} so templates don't need
 * to repeat both the visibility check and the message lookup for every field.
 *
 * @param fieldState The field state from a signal form
 * @returns The error messages to display, or an empty array if none should be shown yet
 *
 * @example
 * ```html
 * <!-- In template -->
 * @for (errorMessage of visibleErrorMessages(userForm.username()); track $index) {
 *   <div class="invalid-feedback">{{errorMessage}}</div>
 * }
 * ```
 */
export function visibleErrorMessages(fieldState: FieldState<any>): string[] {
  return shouldShowErrors(fieldState) ? getErrorMessages(fieldState) : [];
}
