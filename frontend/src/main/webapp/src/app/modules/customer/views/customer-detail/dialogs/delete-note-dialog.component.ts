import {Component, inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

@Component({
  selector: 'tafel-delete-note-dialog',
  imports: [TafelDialogComponent, MatButtonModule],
  templateUrl: 'delete-note-dialog.component.html',
})
export class DeleteNoteDialogComponent {
  readonly dialogRef = inject(MatDialogRef<DeleteNoteDialogComponent>);
}
