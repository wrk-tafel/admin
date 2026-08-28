import {Component, inject, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface EditNoteDialogData {
  initialText: string;
}

@Component({
  selector: 'tafel-edit-note-dialog',
  imports: [TafelDialogComponent, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
  templateUrl: 'edit-note-dialog.component.html',
})
export class EditNoteDialogComponent {
  readonly dialogRef = inject(MatDialogRef<EditNoteDialogComponent>);
  readonly data: EditNoteDialogData = inject(MAT_DIALOG_DATA);
  noteText = signal<string | null>(this.data.initialText);
}
