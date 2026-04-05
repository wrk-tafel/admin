import {Component, inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {ButtonDirective} from '@coreui/angular';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

@Component({
  selector: 'tafel-close-distribution-dialog',
  imports: [TafelDialogComponent, ButtonDirective],
  template: `
    <tafel-dialog type="warning" title="Tag beenden?">
      <div tafel-dialog-content><strong>Achtung:</strong> Dieser Schritt kann nicht rückgängig gemacht werden!</div>
      <div tafel-dialog-actions>
        <button testid="distribution-close-dialog-ok-button" cButton
                (click)="dialogRef.close(true)">OK
        </button>
        <button testid="distribution-close-dialog-cancel-button" cButton color="secondary"
                (click)="dialogRef.close()">Abbrechen
        </button>
      </div>
    </tafel-dialog>
  `,
})
export class CloseDistributionDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CloseDistributionDialogComponent>);
}
