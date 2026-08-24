import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface EmployeeDeleteConfirmDialogData {
  employeeName: string;
}

/**
 * An employee is hard-deleted, not soft-disabled - so this asks before it happens. Deletion always
 * succeeds even once the employee is referenced elsewhere (household issuer, note author, food
 * collection driver/co-driver) - those references are simply cleared. The backend still rejects the
 * delete with a 409 when a user account is linked to the employee, which this dialog can't know in
 * advance.
 */
@Component({
  selector: 'tafel-employee-delete-confirm-dialog',
  imports: [TafelDialogComponent, MatButtonModule],
  templateUrl: 'employee-delete-confirm-dialog.component.html'
})
export class EmployeeDeleteConfirmDialogComponent {
  readonly dialogRef = inject(MatDialogRef<EmployeeDeleteConfirmDialogComponent>);
  readonly data: EmployeeDeleteConfirmDialogData = inject(MAT_DIALOG_DATA);
}
