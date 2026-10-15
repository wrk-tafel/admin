import {Component, inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

/**
 * Says how the printed "Notfallliste" is to be handled before it is downloaded - the whole register
 * of entitled customers on paper. Closes with `true` to download it.
 */
@Component({
  selector: 'tafel-emergency-list-dialog',
  imports: [TafelDialogComponent, MatButtonModule],
  templateUrl: 'emergency-list-dialog.component.html',
})
export class EmergencyListDialogComponent {
  readonly dialogRef = inject(MatDialogRef<EmergencyListDialogComponent>);
}
