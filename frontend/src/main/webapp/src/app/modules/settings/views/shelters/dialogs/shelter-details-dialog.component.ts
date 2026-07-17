import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {MatButton} from '@angular/material/button';
import {ShelterItem} from '../../../../../api/shelter-api.service';

export interface ShelterDetailsDialogData {
  shelter: ShelterItem;
}

@Component({
  selector: 'tafel-shelter-details-dialog',
  templateUrl: 'shelter-details-dialog.component.html',
  imports: [TafelDialogComponent, MatButton]
})
export class ShelterDetailsDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ShelterDetailsDialogComponent>);
  readonly data: ShelterDetailsDialogData = inject(MAT_DIALOG_DATA);

  close() {
    this.dialogRef.close();
  }
}
