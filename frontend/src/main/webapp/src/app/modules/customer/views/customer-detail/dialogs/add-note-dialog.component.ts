import {Component, inject, signal} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

@Component({
  selector: 'tafel-add-note-dialog',
  imports: [TafelDialogComponent, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
  templateUrl: 'add-note-dialog.component.html',
})
export class AddNoteDialogComponent {
  readonly dialogRef = inject(MatDialogRef<AddNoteDialogComponent>);
  noteText = signal<string | null>(null);
}
