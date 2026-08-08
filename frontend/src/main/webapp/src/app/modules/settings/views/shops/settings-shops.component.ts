import {Component, inject, signal} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {MatDialog} from '@angular/material/dialog';
import {MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable
} from '@angular/material/table';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {MatButton} from '@angular/material/button';
import {faEye, faEyeSlash, faMagnifyingGlass, faPencil, faPlus} from '@fortawesome/free-solid-svg-icons';
import {ShopApiService, ShopItem, ShopListResponse} from '../../../../api/shop-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {ShopEditDialogComponent} from './dialogs/shop-edit-dialog.component';
import {ShopDetailsDialogComponent} from './dialogs/shop-details-dialog.component';
import {FormatShopAddressPipe} from '../../../../common/pipes/format-shop-address.pipe';

@Component({
  selector: 'tafel-settings-shops',
  templateUrl: 'settings-shops.component.html',
  imports: [
    FormatShopAddressPipe,
    MatCard,
    MatCardActions,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    MatTable,
    FaIconComponent,
    MatButton
  ]
})
export class SettingsShopsComponent {
  private readonly shopApiService = inject(ShopApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  private _shops = signal<ShopListResponse | null>(null);
  protected shops = this._shops;
  displayedColumns = ['active', 'number', 'name', 'address', 'foodUnit', 'actions'];

  constructor() {
    this.loadShops();
  }

  private loadShops() {
    this.shopApiService.getAllShops().subscribe({
      next: data => this._shops.set(data),
      error: () => this.toastr.error('Fehler beim Laden der Filialen', 'Fehler')
    });
  }

  protected addShop() {
    const dialogRef = this.dialog.open(ShopEditDialogComponent, {
      data: {shop: undefined},
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((created: ShopItem | undefined) => {
      if (created) {
        this.shopApiService.createShop(created).subscribe({
          next: () => {
            this.toastr.success('Filiale erstellt', 'Erfolgreich');
            this.loadShops();
          },
          // the backend's own message (e.g. a duplicate shop number) is what the user needs here
          error: (error: HttpErrorResponse) => this.toastr.error(extractErrorMessage(error), 'Erstellen fehlgeschlagen')
        });
      }
    });
  }

  protected editShop(shop: ShopItem) {
    const dialogRef = this.dialog.open(ShopEditDialogComponent, {
      data: {shop},
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((updated: ShopItem | undefined) => {
      if (updated) {
        this.shopApiService.updateShop(updated.id, updated).subscribe({
          next: () => {
            this.toastr.success('Filiale gespeichert', 'Erfolgreich');
            this.loadShops();
          },
          error: (error: HttpErrorResponse) => this.toastr.error(extractErrorMessage(error), 'Speichern fehlgeschlagen')
        });
      }
    });
  }

  protected toggleShopVisibility(shop: ShopItem, enabled: boolean) {
    this.shopApiService.updateShop(shop.id, {...shop, enabled}).subscribe({
      next: () => {
        this.toastr.success(`Filiale ${shop.name} geändert`, 'Erfolgreich');
        this.loadShops();
      },
      error: (error: HttpErrorResponse) => this.toastr.error(extractErrorMessage(error), 'Fehler beim Ändern')
    });
  }

  protected viewShopDetails(shop: ShopItem) {
    this.dialog.open(ShopDetailsDialogComponent, {
      data: {shop},
      width: '600px'
    });
  }

  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly faPencil = faPencil;
  protected readonly faEye = faEye;
  protected readonly faEyeSlash = faEyeSlash;
  protected readonly faPlus = faPlus;
}
