import {Component, computed, inject, signal} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {RouterLink} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatIcon} from '@angular/material/icon';
import {MatButton, MatIconButton} from '@angular/material/button';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {toSignal} from '@angular/core/rxjs-interop';
import {forkJoin} from 'rxjs';
import {ShopApiService, ShopItem} from '../../../../api/shop-api.service';
import {RouteApiService, RouteData} from '../../../../api/route-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import addIcon from '@material-symbols/svg-400/outlined/add.svg';
import searchIcon from '@material-symbols/svg-400/outlined/search.svg';
import closeIcon from '@material-symbols/svg-400/outlined/close.svg';
import keyboardArrowUpIcon from '@material-symbols/svg-400/outlined/keyboard_arrow_up.svg';
import keyboardArrowDownIcon from '@material-symbols/svg-400/outlined/keyboard_arrow_down.svg';
import editIcon from '@material-symbols/svg-400/outlined/edit.svg';
import locationOnIcon from '@material-symbols/svg-400/outlined/location_on.svg';
import stickyNote2Icon from '@material-symbols/svg-400/outlined/sticky_note_2.svg';
import storefrontIcon from '@material-symbols/svg-400/outlined/storefront.svg';
import {extractErrorMessage} from '../../../../common/api/problem-detail';
import {formatShopAddress} from '../../../../common/util/format-shop-address.util';
import {buildSingleDestinationMapsUrl} from '../../../../common/util/maps-url.util';
import {
  EnabledFilter,
  matchesEnabledFilter
} from '../../../../common/components/tafel-enabled-filter/enabled-filter';
import {
  TafelEnabledFilterComponent
} from '../../../../common/components/tafel-enabled-filter/tafel-enabled-filter.component';
import {
  TafelEnabledToggleComponent
} from '../../../../common/components/tafel-enabled-toggle/tafel-enabled-toggle.component';
import {ShopEditDialogComponent} from './dialogs/shop-edit-dialog.component';
import {
  ShopDisableConfirmDialogComponent,
  ShopDisableConfirmDialogData
} from './dialogs/shop-disable-confirm-dialog.component';

interface ShopRouteUsage {
  routeId: number;
  /** e.g. "Route 1 (14:00)" - the label rendered for the stop's link */
  label: string;
  routeEnabled: boolean;
}

interface ShopView {
  shop: ShopItem;
  address: string;
  mapUrl: string;
  foodUnitLabel: string;
  foodUnitClass: string;
  searchIndex: string;
  /** every route stopping here, active and inactive alike - "can I disable this shop?" needs both */
  routeUsage: ShopRouteUsage[];
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
    MatFormFieldModule,
    MatInputModule,
    TafelEnabledFilterComponent,
    TafelEnabledToggleComponent,
    ReactiveFormsModule,
    MatIcon,
    MatButton,
    MatIconButton,
    RouterLink
  ]
})
export class SettingsShopsComponent {
  private readonly registerIcons = registerSvgIcons({
    add: addIcon,
    search: searchIcon,
    close: closeIcon,
    keyboard_arrow_up: keyboardArrowUpIcon,
    keyboard_arrow_down: keyboardArrowDownIcon,
    edit: editIcon,
    location_on: locationOnIcon,
    sticky_note_2: stickyNote2Icon,
    storefront: storefrontIcon
  });

  private readonly shopApiService = inject(ShopApiService);
  private readonly routeApiService = inject(RouteApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  private readonly _shops = signal<ShopItem[]>([]);
  private readonly _routes = signal<RouteData[]>([]);
  private readonly _loaded = signal(false);
  // keeps the "no shops yet" state from flashing while the list is still on its way
  protected readonly loaded = this._loaded;

  protected readonly searchControl = new FormControl('', {nonNullable: true});
  private readonly searchText = toSignal(this.searchControl.valueChanges, {initialValue: ''});
  protected readonly enabledFilter = signal<EnabledFilter>('ALL');

  protected readonly totalCount = computed(() => this._shops().length);
  protected readonly enabledCount = computed(() => this._shops().filter(shop => shop.enabled).length);
  protected readonly filtered = computed(() => this.searchText().trim().length > 0 || this.enabledFilter() !== 'ALL');

  // every route's stops, grouped by the shop they stop at - built once per routes/shops load rather
  // than per shop, so rendering a long list doesn't re-scan every route once per row
  private readonly routeUsageByShopId = computed(() => {
    const map = new Map<number, ShopRouteUsage[]>();
    for (const route of this._routes()) {
      for (const stop of route.stops) {
        if (stop.shopId == null) {
          continue;
        }
        const usage: ShopRouteUsage = {
          routeId: route.id,
          label: `${route.name} (${formatStopTime(stop.time)})`,
          routeEnabled: route.enabled
        };
        const existing = map.get(stop.shopId) ?? [];
        existing.push(usage);
        map.set(stop.shopId, existing);
      }
    }
    return map;
  });

  private readonly shopViews = computed(() =>
    this._shops().map(shop => toShopView(shop, this.routeUsageByShopId().get(shop.id) ?? []))
  );

  // which records are expanded, by shop id rather than by index, so a search or a filter change
  // does not carry the expanded state over to whichever record now sits at that position
  private readonly expandedIds = signal<ReadonlySet<number>>(new Set());

  protected readonly visibleShops = computed(() => {
    const search = this.searchText().trim().toLowerCase();
    const filter = this.enabledFilter();
    return this.shopViews()
      .filter(view =>
        matchesEnabledFilter(view.shop.enabled, filter) && (search.length === 0 || view.searchIndex.includes(search))
      )
      .sort((a, b) => a.shop.number - b.shop.number);
  });

  // only shown while the list is narrowed down - the unfiltered count is already the summary line
  protected readonly resultCountLabel = computed(() => `${this.visibleShops().length} von ${this.totalCount()} Filialen`);

  protected readonly emptyMessage = computed(() => {
    const filter = this.enabledFilter();
    if (filter === 'ENABLED') {
      return 'Keine aktiven Filialen gefunden.';
    }
    if (filter === 'DISABLED') {
      return 'Keine inaktiven Filialen gefunden.';
    }
    return 'Keine Filiale entspricht der Suche.';
  });

  constructor() {
    this.loadData();
  }

  private loadData() {
    forkJoin({
      shops: this.shopApiService.getAllShops(),
      routes: this.routeApiService.getAllRoutes()
    }).subscribe({
      next: data => {
        this._shops.set(data.shops.shops);
        this._routes.set(data.routes.routes);
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
            this.loadData();
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
            this.loadData();
          },
          error: (error: HttpErrorResponse) => this.toastr.error(extractErrorMessage(error), 'Speichern fehlgeschlagen')
        });
      }
    });
  }

  protected setShopEnabled(shop: ShopItem, enabled: boolean) {
    const activeUsage = this.routeUsageByShopId().get(shop.id)?.filter(usage => usage.routeEnabled) ?? [];
    if (!enabled && activeUsage.length > 0) {
      const data: ShopDisableConfirmDialogData = {
        shopName: shop.name,
        routeStopLabels: activeUsage.map(usage => usage.label)
      };
      const dialogRef = this.dialog.open(ShopDisableConfirmDialogComponent, {data, width: '500px'});
      // no cancel branch needed: tafel-enabled-toggle is controlled by its `enabled` input, so an
      // unconfirmed change never moves the switch in the first place
      dialogRef.afterClosed().subscribe(confirmed => {
        if (confirmed) {
          this.updateShopEnabled(shop, enabled);
        }
      });
      return;
    }

    this.updateShopEnabled(shop, enabled);
  }

  private updateShopEnabled(shop: ShopItem, enabled: boolean) {
    this.shopApiService.updateShop(shop.id, {...shop, enabled}).subscribe({
      next: () => {
        this.toastr.success(`Filiale ${shop.name} geändert`, 'Erfolgreich');
        this.loadData();
      },
      error: (error: HttpErrorResponse) => {
        this.toastr.error(extractErrorMessage(error), 'Fehler beim Ändern');
        // the toggle already moved on its own, so the list has to be re-read to undo it visually
        this.loadData();
      }
    });
  }

  protected isExpanded(shopId: number): boolean {
    return this.expandedIds().has(shopId);
  }

  protected toggleExpanded(shopId: number) {
    const expanded = new Set(this.expandedIds());
    if (!expanded.delete(shopId)) {
      expanded.add(shopId);
    }
    this.expandedIds.set(expanded);
  }

  protected onFilterChanged(filter: EnabledFilter) {
    this.enabledFilter.set(filter);
  }

  protected clearSearch() {
    this.searchControl.setValue('');
  }

}

// the backend sends a LocalTime ("14:00:00"), of which only hours and minutes are ever maintained
function formatStopTime(time: string): string {
  return time?.length >= 5 ? time.substring(0, 5) : time;
}

function toShopView(shop: ShopItem, routeUsage: ShopRouteUsage[]): ShopView {
  const address = formatShopAddress(shop);
  const kilogram = shop.foodUnit === 'KG';
  const foodUnitLabel = kilogram ? 'Kilogramm' : 'Kisten';
  return {
    shop,
    address,
    mapUrl: buildSingleDestinationMapsUrl(address),
    foodUnitLabel,
    // most shops are counted in boxes, so kilogram - the unit that skips the per-category weight
    // conversion in the food-collection recording - is the one worth spotting at a glance
    foodUnitClass: kilogram
      ? `${FOOD_UNIT_BADGE_BASE} border-blue-200 bg-blue-50 text-blue-700`
      : `${FOOD_UNIT_BADGE_BASE} border-slate-200 bg-slate-100 text-slate-600`,
    searchIndex: [shop.number, shop.name, address, shop.contactPerson, shop.phone, shop.note]
      .join(' ')
      .toLowerCase(),
    routeUsage
  };
}
