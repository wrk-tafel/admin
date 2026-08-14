import {inject} from '@angular/core';
import {CanDeactivateFn} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {map} from 'rxjs/operators';
import {
  UnsavedChangesDialogComponent
} from '../../components/unsaved-changes-dialog/unsaved-changes-dialog.component';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * Guards navigating away from the customer create/edit form while it holds unsaved input - the
 * longest form in the app, easily half an hour of intake data with nothing protecting it before
 * this guard existed. Delegates the "is there anything to lose" question to the component itself
 * (its signal-forms dirty state, cleared once a save actually completes - see
 * {@link CustomerEditComponent.hasUnsavedChanges}) and only then asks the operator to confirm.
 */
export const customerEditUnsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) {
    return true;
  }

  return inject(MatDialog).open(UnsavedChangesDialogComponent).afterClosed().pipe(
    map(confirmed => confirmed === true)
  );
};
