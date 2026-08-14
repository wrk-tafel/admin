import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';

export interface ShopDisableConfirmDialogData {
  shopName: string;
  /** the labels of the active routes' stops at this shop, e.g. "Route 1 (14:00)" */
  routeStopLabels: string[];
}

/**
 * Shown only when a shop being deactivated is still stopped at by at least one active route -
 * route editing keeps such a stop rather than dropping it, but the driver-facing Routen-Navi then
 * flags the stop "Filiale inaktiv" (#3239), which is what this dialog names before it happens.
 */
@Component({
  selector: 'tafel-shop-disable-confirm-dialog',
  imports: [TafelDialogComponent, MatButtonModule],
  templateUrl: 'shop-disable-confirm-dialog.component.html'
})
export class ShopDisableConfirmDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ShopDisableConfirmDialogComponent>);
  readonly data: ShopDisableConfirmDialogData = inject(MAT_DIALOG_DATA);
}
