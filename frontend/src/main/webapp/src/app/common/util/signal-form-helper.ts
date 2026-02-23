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
 * Check if a field should show errors (has errors and is touched or dirty)
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
  return !fieldState.valid() && (fieldState.dirty() || fieldState.touched());
}
