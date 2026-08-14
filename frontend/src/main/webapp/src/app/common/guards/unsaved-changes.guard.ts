import {inject} from '@angular/core';
import {CanDeactivateFn} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {map} from 'rxjs/operators';
import {Observable} from 'rxjs';
import {UnsavedChangesDialogComponent} from '../components/unsaved-changes-dialog/unsaved-changes-dialog.component';

/**
 * Implemented by a routed form component to opt into `unsavedChangesGuard` below.
 */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * Confirms navigating away from a form with unsaved changes rather than silently discarding them.
 * A component opts in by implementing {@link HasUnsavedChanges} and wiring this onto its route's
 * `canDeactivate` (see `user.routes.ts`).
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component): boolean | Observable<boolean> => {
  if (!component.hasUnsavedChanges()) {
    return true;
  }

  const dialog = inject(MatDialog);
  return dialog.open(UnsavedChangesDialogComponent).afterClosed().pipe(
    map(confirmed => confirmed === true)
  );
};
