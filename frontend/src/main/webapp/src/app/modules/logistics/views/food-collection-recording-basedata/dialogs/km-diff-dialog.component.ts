import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ButtonDirective} from '@coreui/angular';
import {DecimalPipe} from '@angular/common';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface KmDiffDialogData {
  kmDifference: number;
}

@Component({
  selector: 'tafel-km-diff-dialog',
  imports: [TafelDialogComponent, ButtonDirective, DecimalPipe],
  templateUrl: './km-diff-dialog.component.html',
})
export class KmDiffDialogComponent {
  readonly dialogRef = inject(MatDialogRef<KmDiffDialogComponent>);
  readonly data: KmDiffDialogData = inject(MAT_DIALOG_DATA);
}
