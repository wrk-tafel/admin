import {Component, computed, effect, inject, input, model, signal} from '@angular/core';

import {FoodCategory} from '../../../../api/food-categories-api.service';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ButtonDirective, ColComponent, RowComponent} from '@coreui/angular';
import {
  FoodCollectionCategoryWithAmount,
  FoodCollectionItem,
  FoodCollectionsApiService,
  FoodCollectionSaveItemsPerShopRequest
} from '../../../../api/food-collections-api.service';
import {SelectedRouteData} from '../food-collection-recording/food-collection-recording.component';
import {Shop} from '../../../../api/route-api.service';
import {
  TafelCounterInputComponent,
  TafelCounterInputValueChange
} from '../../../../common/components/tafel-counter-input/tafel-counter-input.component';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';

@Component({
    selector: 'tafel-food-collection-recording-items-responsive',
    templateUrl: 'food-collection-recording-items-responsive.component.html',
    imports: [
    ReactiveFormsModule,
    FormsModule,
    ButtonDirective,
    RowComponent,
    ColComponent,
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
  private readonly toastService = inject(ToastService);

  loadEffect = effect(() => {
    if (this.selectedRouteData()) {
      const shop = this.findNextUnfilledShop();
      this.selectShop(shop);
    }
  });

  private findNextUnfilledShop(): Shop {
    const shops = this.selectedRouteData().shops;
    for (const shop of shops) {
      const items = this.selectedRouteData().foodCollectionData?.items ?? [];
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

    const routeId = this.selectedRouteData().route.id;
    const shopId = this.currentShop().id;
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
        this.toastService.showToast({type: ToastType.SUCCESS, title: 'Daten wurden gespeichert!'});
      },
      error: (error: any) => {
        this.toastService.showToast({type: ToastType.ERROR, title: 'Speichern fehlgeschlagen!'});
      }
    };
    this.foodCollectionsApiService.saveItemsPerShop(routeId, shopId, saveItemsRequest).subscribe(observer);
  }

  onValueChange(valueChange: TafelCounterInputValueChange) {
    if (!this.selectedRouteData() || !this.currentShop()) {
      return;
    }

    const routeId = this.selectedRouteData().route.id;
    const shopId = this.currentShop().id;

    this.categoryValues.update(values => ({
      ...values,
      [valueChange.key as number]: valueChange.value
    }));

    const data: FoodCollectionItem = {
      categoryId: valueChange.key as number,
      shopId: shopId,
      amount: valueChange.value
    };
    this.foodCollectionsApiService.patchItems(routeId, data).subscribe();
  }

  selectShop(shop: Shop) {
    if (!this.selectedRouteData()) {
      return;
    }

    const routeId = this.selectedRouteData().route.id;
    const shopId = shop.id;

    const observer = {
      next: (data) => {
        const newValues: Record<number, number> = {};
        for (const category of this.foodCategories()) {
          newValues[category.id] = this.getCurrentValue(
            data?.items ?? [],
            category,
            shop
          );
        }
        this.categoryValues.set(newValues);
        this.currentShop.set(shop);
      },
      error: (error: any) => {
        this.toastService.showToast({type: ToastType.ERROR, title: 'Laden fehlgeschlagen!'});
      }
    };
    this.foodCollectionsApiService.getItemsPerShop(routeId, shopId).subscribe(observer);
  }

  selectPreviousShop() {
    if (!this.currentShop() || !this.selectedRouteData()) {
      return;
    }

    const currentShop = this.currentShop();
    const shop = this.selectedRouteData().shops[this.selectedRouteData().shops.indexOf(currentShop) - 1];
    this.selectShop(shop);
  }

  selectNextShop() {
    if (!this.currentShop() || !this.selectedRouteData()) {
      return;
    }

    const currentShop = this.currentShop();
    const shop = this.selectedRouteData().shops[this.selectedRouteData().shops.indexOf(currentShop) + 1];
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
