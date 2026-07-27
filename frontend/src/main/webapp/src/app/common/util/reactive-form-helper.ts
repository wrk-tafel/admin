import {AbstractControl} from '@angular/forms';

/**
 * Get the `is-invalid`/`is-valid` CSS classes for a reactive form control, for use with `[ngClass]`.
 *
 * Gates `is-invalid` on `touched` only (not `dirty`) so errors don't flash while the user is
 * still typing into the field.
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
    'is-invalid': control.invalid && control.touched,
    'is-valid': control.valid && (control.dirty || control.touched)
  };
}
