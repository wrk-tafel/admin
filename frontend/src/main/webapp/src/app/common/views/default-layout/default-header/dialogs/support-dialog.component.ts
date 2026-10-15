import {Component, inject, signal} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckbox} from '@angular/material/checkbox';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface SupportDialogResult {
  title: string;
  text: string;
  /** Whether the screenshot of the current page, taken before the dialog opened, goes along. */
  includeScreenshot: boolean;
}

@Component({
  selector: 'tafel-support-dialog',
  imports: [TafelDialogComponent, MatButtonModule, MatCheckbox, MatFormFieldModule, MatInputModule, FormsModule],
  templateUrl: 'support-dialog.component.html',
})
export class SupportDialogComponent {
  readonly dialogRef = inject(MatDialogRef<SupportDialogComponent>);

  supportTitle = signal<string | null>(null);
  supportText = signal<string | null>(null);
  includeScreenshot = signal(true);

  save() {
    this.dialogRef.close({title: this.supportTitle(), text: this.supportText(), includeScreenshot: this.includeScreenshot()});
  }
}
