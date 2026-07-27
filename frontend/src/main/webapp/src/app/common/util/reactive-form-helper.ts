import {AbstractControl} from '@angular/forms';

/**
 * Check if a reactive form control should be shown as invalid.
 *
 * Only gates on `touched` (set on blur) rather than `dirty` so errors don't flash
 * while the user is still typing into the field.
 *
 * @param control The reactive form control (or group/array)
 *
 * @example
 * ```html
 * <!-- In template -->
 * <input formControlName="lastname" [class.is-invalid]="isControlInvalid(lastname)">
 * ```
 */
export function isControlInvalid(control: AbstractControl): boolean {
  return control.invalid && control.touched;
}

/**
 * Check if a reactive form control should be shown as valid.
 *
 * @param control The reactive form control (or group/array)
 *
 * @example
 * ```html
 * <!-- In template -->
 * <input formControlName="lastname" [class.is-valid]="isControlValid(lastname)">
 * ```
 */
export function isControlValid(control: AbstractControl): boolean {
  return control.valid && (control.dirty || control.touched);
}

/**
 * Get the `is-invalid`/`is-valid` CSS classes for a reactive form control, for use with `[ngClass]`.
 *
 * @param control The reactive form control
 * @returns An object suitable for binding to `[ngClass]`
 *
 * @example
 * ```html
 * <!-- In template -->
 * <input formControlName="lastname" [ngClass]="controlStateClasses(lastname)">
 * ```
 */
export function controlStateClasses(control: AbstractControl): Record<string, boolean> {
  return {
    'is-invalid': isControlInvalid(control),
    'is-valid': isControlValid(control)
  };
}
