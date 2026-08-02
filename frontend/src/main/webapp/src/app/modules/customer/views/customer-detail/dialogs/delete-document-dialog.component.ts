import {Component, inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

@Component({
  selector: 'tafel-delete-document-dialog',
  imports: [TafelDialogComponent, MatButtonModule],
  templateUrl: 'delete-document-dialog.component.html',
})
export class DeleteDocumentDialogComponent {
  readonly dialogRef = inject(MatDialogRef<DeleteDocumentDialogComponent>);
}
