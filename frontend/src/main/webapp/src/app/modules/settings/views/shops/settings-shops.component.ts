import {Component, computed, inject, signal} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {MatDialog} from '@angular/material/dialog';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonToggleChange, MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatSlideToggleChange, MatSlideToggleModule} from '@angular/material/slide-toggle';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {MatButton, MatIconButton} from '@angular/material/button';
import {faMagnifyingGlass, faNoteSticky, faPencil, faPlus, faShop, faXmark} from '@fortawesome/free-solid-svg-icons';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {toSignal} from '@angular/core/rxjs-interop';
import {ShopApiService, ShopItem} from '../../../../api/shop-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {formatShopAddress} from '../../../../common/util/format-shop-address.util';
import {EnabledFilter, matchesEnabledFilter} from '../enabled-filter';
import {ShopEditDialogComponent} from './dialogs/shop-edit-dialog.component';

interface ShopView {
  shop: ShopItem;
  address: string;
  foodUnitLabel: string;
  foodUnitClass: string;
  searchIndex: string;
}

const FOOD_UNIT_BADGE_BASE = 'rounded-md border px-2 py-0.5 text-xs font-medium';

@Component({
  selector: 'tafel-settings-shops',
  templateUrl: 'settings-shops.component.html',
  imports: [
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonToggleModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    FaIconComponent,
    MatButton,
    MatIconButton
  ]
})
export class SettingsShopsComponent {
  private readonly shopApiService = inject(ShopApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  private readonly _shops = signal<ShopItem[]>([]);
  private readonly _loaded = signal(false);
  // keeps the "no shops yet" state from flashing while the list is still on its way
  protected readonly loaded = this._loaded;

  protected readonly searchControl = new FormControl('', {nonNullable: true});
  private readonly searchText = toSignal(this.searchControl.valueChanges, {initialValue: ''});
  protected readonly enabledFilter = signal<EnabledFilter>('ALL');

  protected readonly totalCount = computed(() => this._shops().length);
  protected readonly enabledCount = computed(() => this._shops().filter(shop => shop.enabled).length);
  protected readonly filtered = computed(() => this.searchText().trim().length > 0 || this.enabledFilter() !== 'ALL');

  private readonly shopViews = computed(() => this._shops().map(shop => toShopView(shop)));

  protected readonly visibleShops = computed(() => {
    const search = this.searchText().trim().toLowerCase();
    const filter = this.enabledFilter();
    return this.shopViews().filter(view =>
      matchesEnabledFilter(view.shop.enabled, filter) && (search.length === 0 || view.searchIndex.includes(search))
    );
  });

  constructor() {
    this.loadShops();
  }

  private loadShops() {
    this.shopApiService.getAllShops().subscribe({
      next: data => {
        this._shops.set(data.shops);
        this._loaded.set(true);
      },
      error: () => {
        this.toastr.error('Fehler beim Laden der Filialen', 'Fehler');
        this._loaded.set(true);
      }
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

  protected onEnabledToggled(shop: ShopItem, event: MatSlideToggleChange) {
    this.setShopEnabled(shop, event.checked);
  }

  protected setShopEnabled(shop: ShopItem, enabled: boolean) {
    this.shopApiService.updateShop(shop.id, {...shop, enabled}).subscribe({
      next: () => {
        this.toastr.success(`Filiale ${shop.name} geändert`, 'Erfolgreich');
        this.loadShops();
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(extractErrorMessage(error), 'Fehler beim Ändern');
        // the toggle already moved on its own, so the list has to be re-read to undo it visually
        this.loadShops();
      }
    });
  }

  protected onFilterChanged(event: MatButtonToggleChange) {
    this.enabledFilter.set(event.value as EnabledFilter);
  }

  protected clearSearch() {
    this.searchControl.setValue('');
  }

  protected readonly faPencil = faPencil;
  protected readonly faPlus = faPlus;
  protected readonly faMagnifyingGlass = faMagnifyingGlass;
  protected readonly faXmark = faXmark;
  protected readonly faNoteSticky = faNoteSticky;
  protected readonly faShop = faShop;
}

function toShopView(shop: ShopItem): ShopView {
  const address = formatShopAddress(shop);
  const kilogram = shop.foodUnit === 'KG';
  const foodUnitLabel = kilogram ? 'Kilogramm' : 'Kisten';
  return {
    shop,
    address,
    foodUnitLabel,
    // most shops are counted in boxes, so kilogram - the unit that skips the per-category weight
    // conversion in the food-collection recording - is the one worth spotting at a glance
    foodUnitClass: kilogram
      ? `${FOOD_UNIT_BADGE_BASE} border-blue-200 bg-blue-50 text-blue-700`
      : `${FOOD_UNIT_BADGE_BASE} border-slate-200 bg-slate-100 text-slate-600`,
    searchIndex: [shop.number, shop.name, address, shop.contactPerson, shop.phone, shop.note]
      .join(' ')
      .toLowerCase()
  };
}
