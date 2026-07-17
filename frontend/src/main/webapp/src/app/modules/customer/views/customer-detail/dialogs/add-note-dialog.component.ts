import {Component, inject, signal} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {FormsModule} from '@angular/forms';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

@Component({
  selector: 'tafel-add-note-dialog',
  imports: [TafelDialogComponent, MatButtonModule, FormsModule],
  templateUrl: 'add-note-dialog.component.html',
})
export class AddNoteDialogComponent {
  readonly dialogRef = inject(MatDialogRef<AddNoteDialogComponent>);
  noteText = signal<string | null>(null);
}
