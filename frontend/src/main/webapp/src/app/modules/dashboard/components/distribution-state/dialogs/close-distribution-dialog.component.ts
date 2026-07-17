import {Component, inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {MatButton} from '@angular/material/button';

@Component({
  selector: 'tafel-close-distribution-dialog',
  imports: [TafelDialogComponent, MatButton],
  templateUrl: 'close-distribution-dialog.component.html'
})
export class CloseDistributionDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CloseDistributionDialogComponent>);
}
