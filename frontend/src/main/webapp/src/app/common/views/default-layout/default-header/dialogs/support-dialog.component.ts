import {Component, inject, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface SupportDialogData {
  /** The page as it looked when support was opened, or null when no screenshot could be taken. */
  screenshot: string | null;
}

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

  /**
   * The screenshot that will be sent, shown here as a preview: it always goes along, so the least
   * it can do is not be a surprise - what is on the screen is what lands in the mail.
   */
  readonly data = inject<SupportDialogData | null>(MAT_DIALOG_DATA, {optional: true});

  supportTitle = signal<string | null>(null);
  supportText = signal<string | null>(null);

  save() {
    this.dialogRef.close({title: this.supportTitle(), text: this.supportText()});
  }
}
