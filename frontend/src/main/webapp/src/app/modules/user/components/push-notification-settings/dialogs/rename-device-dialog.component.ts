import {Component, inject, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FormsModule} from '@angular/forms';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface RenameDeviceDialogData {
  currentLabel: string | null;
}

@Component({
  selector: 'tafel-rename-device-dialog',
  imports: [TafelDialogComponent, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
  templateUrl: 'rename-device-dialog.component.html',
})
export class RenameDeviceDialogComponent {
  readonly dialogRef = inject(MatDialogRef<RenameDeviceDialogComponent>);
  readonly data: RenameDeviceDialogData = inject(MAT_DIALOG_DATA);
  labelInput = signal(this.data.currentLabel ?? '');

  save() {
    const trimmed = this.labelInput().trim();
    this.dialogRef.close(trimmed ? trimmed : null);
  }
}
