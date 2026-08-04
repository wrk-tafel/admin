import {Component, inject, signal} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface SupportDialogResult {
  title: string;
  text: string;
}

@Component({
  selector: 'tafel-support-dialog',
  imports: [TafelDialogComponent, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
  templateUrl: 'support-dialog.component.html',
})
export class SupportDialogComponent {
  readonly dialogRef = inject(MatDialogRef<SupportDialogComponent>);
  supportTitle = signal<string | null>(null);
  supportText = signal<string | null>(null);

  save() {
    this.dialogRef.close({title: this.supportTitle(), text: this.supportText()});
  }
}
