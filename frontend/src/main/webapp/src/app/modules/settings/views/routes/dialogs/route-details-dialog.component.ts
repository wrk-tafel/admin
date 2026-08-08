import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MatButton} from '@angular/material/button';
import {TafelDialogComponent} from '../../../../../common/components/tafel-dialog/tafel-dialog.component';
import {RouteData, RouteStopData} from '../../../../../api/route-api.service';
import {ShopItem} from '../../../../../api/shop-api.service';

export interface RouteDetailsDialogData {
  route: RouteData;
  shops: ShopItem[];
}

@Component({
  selector: 'tafel-route-details-dialog',
  templateUrl: 'route-details-dialog.component.html',
  imports: [TafelDialogComponent, MatButton]
})
export class RouteDetailsDialogComponent {
  readonly dialogRef = inject(MatDialogRef<RouteDetailsDialogComponent>);
  readonly data: RouteDetailsDialogData = inject(MAT_DIALOG_DATA);

  protected shopLabel(stop: RouteStopData): string {
    const shop = this.data.shops.find(candidate => candidate.id === stop.shopId);
    return shop ? `${shop.number} - ${shop.name}` : 'Kein Markt';
  }

  close() {
    this.dialogRef.close();
  }
}
