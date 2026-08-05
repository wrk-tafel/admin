import {Component, inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

@Component({
  selector: 'tafel-delete-login-attempt-dialog',
  imports: [TafelDialogComponent, MatButtonModule],
  templateUrl: 'delete-login-attempt-dialog.component.html',
})
export class DeleteLoginAttemptDialogComponent {
  readonly dialogRef = inject(MatDialogRef<DeleteLoginAttemptDialogComponent>);
}
