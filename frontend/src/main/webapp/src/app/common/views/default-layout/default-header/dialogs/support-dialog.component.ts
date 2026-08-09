import {Component, inject, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {FormsModule} from '@angular/forms';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface SupportDialogData {
  /** The page as it looked when support was opened, or null when no screenshot could be taken. */
  screenshot: string | null;
}

export interface SupportDialogResult {
  title: string;
  text: string;
  includeScreenshot: boolean;
}

@Component({
  selector: 'tafel-support-dialog',
  imports: [TafelDialogComponent, MatButtonModule, MatFormFieldModule, MatInputModule, MatCheckboxModule, FormsModule],
  templateUrl: 'support-dialog.component.html',
})
export class SupportDialogComponent {
  readonly dialogRef = inject(MatDialogRef<SupportDialogComponent>);
  readonly data = inject<SupportDialogData | null>(MAT_DIALOG_DATA, {optional: true});

  supportTitle = signal<string | null>(null);
  supportText = signal<string | null>(null);

  /**
   * Attached by default - it is the most useful part of the report. Shown as a preview right here
   * so the decision to leave it out is an informed one: a screenshot of a customer screen carries
   * that customer's data into a mailbox.
   */
  includeScreenshot = signal(true);

  save() {
    this.dialogRef.close({
      title: this.supportTitle(),
      text: this.supportText(),
      includeScreenshot: this.includeScreenshot()
    });
  }
}
