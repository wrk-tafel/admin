import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButton} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {ShopItem} from '../../../../../api/shop-api.service';
import {FormatShopAddressPipe} from '../../../../../common/pipes/format-shop-address.pipe';

export interface ShopDetailsDialogData {
  shop: ShopItem;
}

@Component({
  selector: 'tafel-shop-details-dialog',
  templateUrl: 'shop-details-dialog.component.html',
  imports: [TafelDialogComponent, MatButton, FormatShopAddressPipe]
})
export class ShopDetailsDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ShopDetailsDialogComponent>);
  readonly data: ShopDetailsDialogData = inject(MAT_DIALOG_DATA);

  close() {
    this.dialogRef.close();
  }
}
