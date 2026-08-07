import {AbstractControl, FormArray, FormGroup, ValidationErrors, ValidatorFn} from '@angular/forms';

export const RETURN_ITEM_DESCRIPTION_MAX_LENGTH = 100;

/**
 * Return boxes are stored by their description, so two rows describing the same box for the same
 * shop would collapse into one on save - and a free-text row repeating one of the pre-defined
 * return categories would silently overwrite that category's counter. Both are rejected up front
 * instead.
 */
export function normalizeReturnItemDescription(description: string | null | undefined): string {
  return (description ?? '').trim().toLocaleLowerCase('de-AT');
}

export function duplicateDescriptionValidator(
  reservedDescriptions: () => string[],
  shopKeyOf: (row: FormGroup) => unknown = () => 'single-shop'
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const rows = (control as FormArray).controls as FormGroup[];
    const reserved = reservedDescriptions().map(normalizeReturnItemDescription);
    const seen = new Set<string>();
    let hasDuplicate = false;

    for (const row of rows) {
      const descriptionControl = row.get('description')!;
      const description = normalizeReturnItemDescription(descriptionControl.value);
      if (description.length === 0) {
        clearDuplicateError(descriptionControl);
        continue;
      }

      const key = `${String(shopKeyOf(row))}:${description}`;
      if (seen.has(key) || reserved.includes(description)) {
        descriptionControl.setErrors({...descriptionControl.errors, duplicate: true});
        hasDuplicate = true;
      } else {
        clearDuplicateError(descriptionControl);
      }
      seen.add(key);
    }

    return hasDuplicate ? {duplicate: true} : null;
  };
}

function clearDuplicateError(control: AbstractControl) {
  if (!control.errors?.duplicate) {
    return;
  }

  const remainingErrors: ValidationErrors = {...control.errors};
  delete remainingErrors.duplicate;
  control.setErrors(Object.keys(remainingErrors).length > 0 ? remainingErrors : null);
}
