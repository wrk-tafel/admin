import {inject} from '@angular/core';
import {CanDeactivateFn} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {Observable} from 'rxjs';
import {UnsavedChangesDialogComponent} from '../components/unsaved-changes-dialog/unsaved-changes-dialog.component';

/** A screen that saves explicitly and can therefore be left with work in it. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/**
 * Confirms leaving a screen whose changes have not been saved.
 *
 * A screen that saves on an explicit "Speichern" is a screen whose changes a navigation silently
 * throws away - a sidebar link, the browser's back button, a link out of the page. Asking is the
 * only thing that makes the difference between the two visible while it is still undoable.
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> =
  (component): Observable<boolean> | boolean => {
    if (!component.hasUnsavedChanges()) {
      return true;
    }

    return inject(MatDialog)
      .open(UnsavedChangesDialogComponent, {width: '500px'})
      .afterClosed();
  };
