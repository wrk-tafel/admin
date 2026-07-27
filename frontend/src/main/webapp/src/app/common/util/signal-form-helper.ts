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
  return errors.map((error: any) => error.message).filter((message: string) => message);
}

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

/**
 * Get the `is-invalid`/`is-valid` CSS classes for a field, for use with `[ngClass]`.
 *
 * @param fieldState The field state from a signal form
 * @returns An object suitable for binding to `[ngClass]`
 *
 * @example
 * ```html
 * <!-- In template -->
 * <input [ngClass]="fieldStateClasses(userForm.username())">
 * ```
 */
export function fieldStateClasses(fieldState: FieldState<any>): Record<string, boolean> {
  return {
    'is-invalid': shouldShowErrors(fieldState),
    'is-valid': fieldState.valid() && (fieldState.dirty() || fieldState.touched())
  };
}
