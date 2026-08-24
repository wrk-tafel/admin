import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface CarDeleteConfirmDialogData {
  carName: string;
}

/**
 * A car is hard-deleted, not soft-disabled - so this asks before it happens. The backend still
 * rejects the delete with a 409 when the car turns out to be referenced by a recorded food
 * collection; this dialog only confirms the intent, it can't know that in advance.
 */
@Component({
  selector: 'tafel-car-delete-confirm-dialog',
  imports: [TafelDialogComponent, MatButtonModule],
  templateUrl: 'car-delete-confirm-dialog.component.html'
})
export class CarDeleteConfirmDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CarDeleteConfirmDialogComponent>);
  readonly data: CarDeleteConfirmDialogData = inject(MAT_DIALOG_DATA);
}
