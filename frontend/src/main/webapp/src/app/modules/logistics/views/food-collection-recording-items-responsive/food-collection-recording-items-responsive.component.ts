import {Component, computed, effect, inject, input, model, signal} from '@angular/core';

import {FoodCategory} from '../../../../api/food-categories-api.service';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {
  FoodCollectionCategoryWithAmount,
  FoodCollectionItem,
  FoodCollectionItemsPerShopResponse,
  FoodCollectionsApiService,
  FoodCollectionSaveItemsPerShopRequest
} from '../../../../api/food-collections-api.service';
import {SelectedRouteData} from '../food-collection-recording/food-collection-recording.component';
import {Shop} from '../../../../api/route-api.service';
import {
  TafelCounterInputComponent,
  TafelCounterInputValueChange
} from '../../../../common/components/tafel-counter-input/tafel-counter-input.component';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {FoodCollectionOfflineQueueService} from '../../services/food-collection-offline-queue.service';
import {ConnectivityService} from '../../../../common/connectivity/connectivity.service';

@Component({
  selector: 'tafel-food-collection-recording-items-responsive',
  templateUrl: 'food-collection-recording-items-responsive.component.html',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    TafelCounterInputComponent
  ]
})
export class FoodCollectionRecordingItemsResponsiveComponent {
  foodCategories = model.required<FoodCategory[]>();
  selectedRouteData = input<SelectedRouteData>();

  readonly foodCategoriesItems = computed(() =>
    this.foodCategories().filter(category => !category.returnItem)
  );
  readonly foodCategoriesReturn = computed(() =>
    this.foodCategories().filter(category => category.returnItem)
  );
  currentShop = signal<Shop | null>(null);
  categoryValues = signal<Record<number, number>>({});

  private readonly foodCollectionsApiService = inject(FoodCollectionsApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly offlineQueueService = inject(FoodCollectionOfflineQueueService);
  private readonly connectivityService = inject(ConnectivityService);

  protected readonly isOnline = this.connectivityService.isOnline();
  protected readonly pendingSyncCount = this.offlineQueueService.pendingCount;

  // Last known values per shop for this session, used as a fallback while offline. Seeded from
  // the route-level snapshot on first read of a shop, refreshed on every successful live load,
  // and updated immediately on every local edit so a same-session change is never masked by a
  // stale fallback even before it's confirmed sent.
  private readonly shopValuesCache = new Map<number, Record<number, number>>();

  loadEffect = effect(() => {
    if (this.selectedRouteData()) {
      const shop = this.findNextUnfilledShop();
      this.selectShop(shop);
    }
  });

  private findNextUnfilledShop(): Shop {
    const shops = this.selectedRouteData()!.shops;
    for (const shop of shops) {
      const items = this.selectedRouteData()!.foodCollectionData?.items ?? [];
      const itemsPerShop = items.filter(
        item => item.shopId === shop.id
      );

      if (itemsPerShop.length === 0) {
        return shop;
      }

      for (const category of this.foodCategories()) {
        const currentValue = this.getCurrentValue(itemsPerShop, category, shop);
        if (currentValue === 0) {
          return shop;
        }
      }
    }

    return shops[shops.length - 1];
  }

  save() {
    if (!this.selectedRouteData() || !this.currentShop()) {
      return;
    }

    const routeId = this.selectedRouteData()!.route.id;
    const shopId = this.currentShop()!.id;
    const values = this.categoryValues();

    const saveItemsRequest: FoodCollectionSaveItemsPerShopRequest = {
      items: this.foodCategories().map(category => {
        const item: FoodCollectionCategoryWithAmount = {
          categoryId: category.id,
          amount: values[category.id] || 0
        };
        return item;
      })
    };

    const observer = {
      next: () => {
        this.toastr.success('Daten wurden gespeichert!');
      },
      error: () => {
        this.toastr.error('Speichern fehlgeschlagen!');
      }
    };
    this.foodCollectionsApiService.saveItemsPerShop(routeId, shopId, saveItemsRequest).subscribe(observer);
  }

  onValueChange(valueChange: TafelCounterInputValueChange) {
    if (!this.selectedRouteData() || !this.currentShop()) {
      return;
    }

    const routeId = this.selectedRouteData()!.route.id;
    const shopId = this.currentShop()!.id;
    const categoryId = valueChange.key as number;

    this.categoryValues.update(values => ({
      ...values,
      [categoryId]: valueChange.value
    }));
    this.shopValuesCache.set(shopId, {...this.shopValuesCache.get(shopId), [categoryId]: valueChange.value});

    // Handed off to the offline queue rather than sent directly: it persists the change, sends it
    // straight away when online, and otherwise keeps retrying once connectivity returns - needed
    // since this screen is used by the codriver on their phone on the road.
    this.offlineQueueService.enqueue(routeId, shopId, categoryId, valueChange.value);
  }

  selectShop(shop: Shop) {
    if (!this.selectedRouteData()) {
      return;
    }

    const routeId = this.selectedRouteData()!.route.id;
    const shopId = shop.id;

    if (!this.connectivityService.isOnline()()) {
      this.applyFallbackShopValues(shop, 'Offline - zuletzt bekannter Stand wird angezeigt.');
      return;
    }

    const observer = {
      next: (data: FoodCollectionItemsPerShopResponse) => {
        this.applyShopValues(shop, data?.items ?? []);
      },
      error: () => {
        this.applyFallbackShopValues(shop, 'Laden fehlgeschlagen, zuletzt bekannter Stand wird angezeigt.');
      }
    };
    this.foodCollectionsApiService.getItemsPerShop(routeId, shopId).subscribe(observer);
  }

  private applyShopValues(shop: Shop, items: FoodCollectionItem[]) {
    const newValues: Record<number, number> = {};
    for (const category of this.foodCategories()) {
      newValues[category.id] = this.getCurrentValue(items, category, shop);
    }
    this.mergePendingValues(shop, newValues);

    this.shopValuesCache.set(shop.id, newValues);
    this.categoryValues.set(newValues);
    this.currentShop.set(shop);
  }

  private applyFallbackShopValues(shop: Shop, warningMessage: string) {
    const initialItems = this.selectedRouteData()!.foodCollectionData?.items ?? [];
    const cached = this.shopValuesCache.get(shop.id);

    const newValues: Record<number, number> = {...cached};
    if (!cached) {
      for (const category of this.foodCategories()) {
        newValues[category.id] = this.getCurrentValue(initialItems, category, shop);
      }
    }
    this.mergePendingValues(shop, newValues);

    this.categoryValues.set(newValues);
    this.currentShop.set(shop);
    this.toastr.warning(warningMessage);
  }

  private mergePendingValues(shop: Shop, values: Record<number, number>) {
    const routeId = this.selectedRouteData()!.route.id;
    for (const pending of this.offlineQueueService.getPendingForShop(routeId, shop.id)) {
      values[pending.categoryId] = pending.amount;
    }
  }

  selectPreviousShop() {
    if (!this.currentShop() || !this.selectedRouteData()) {
      return;
    }

    const currentShop = this.currentShop()!;
    const shop = this.selectedRouteData()!.shops[this.selectedRouteData()!.shops.indexOf(currentShop) - 1];
    this.selectShop(shop);
  }

  selectNextShop() {
    if (!this.currentShop() || !this.selectedRouteData()) {
      return;
    }

    const currentShop = this.currentShop()!;
    const shop = this.selectedRouteData()!.shops[this.selectedRouteData()!.shops.indexOf(currentShop) + 1];
    this.selectShop(shop);
  }

  private getCurrentValue(items: FoodCollectionItem[], category: FoodCategory, shop: Shop) {
    const filteredItems = items.filter(data => data.categoryId === category.id && data.shopId === shop.id);
    if (filteredItems.length === 1) {
      return filteredItems[0].amount;
    }
    return 0;
  }

}
