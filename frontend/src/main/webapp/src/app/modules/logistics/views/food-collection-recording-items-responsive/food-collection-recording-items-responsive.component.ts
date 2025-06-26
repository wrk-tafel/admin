import {Component, effect, inject, input, model} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FoodCategory} from '../../../../api/food-categories-api.service';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ButtonDirective, ColComponent, RowComponent} from "@coreui/angular";
import {
  FoodCollectionCategoryWithAmount,
  FoodCollectionItem,
  FoodCollectionsApiService,
  FoodCollectionSaveItemsPerShopRequest
} from "../../../../api/food-collections-api.service";
import {SelectedRouteData} from "../food-collection-recording/food-collection-recording.component";
import {Shop} from "../../../../api/route-api.service";
import {
  TafelCounterInputComponent,
  TafelCounterInputValueChange
} from "../../../../common/components/tafel-counter-input/tafel-counter-input.component";
import {ToastService, ToastType} from "../../../../common/components/toasts/toast.service";

@Component({
  selector: 'tafel-food-collection-recording-items-responsive',
  templateUrl: 'food-collection-recording-items-responsive.component.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ButtonDirective,
    RowComponent,
    ColComponent,
    TafelCounterInputComponent,
  ],
  standalone: true
})
export class FoodCollectionRecordingItemsResponsiveComponent {
  foodCategories = model.required<FoodCategory[]>();
  selectedRouteData = input<SelectedRouteData>();

  currentShop: Shop;
  categoryValues: Record<number, number> = {};

  private readonly foodCollectionsApiService = inject(FoodCollectionsApiService);
  private readonly toastService = inject(ToastService);

  loadEffect = effect(() => {
    const shop = this.findNextUnfilledShop();
    this.selectShop(shop);
  });

  private findNextUnfilledShop(): Shop {
    const shops = this.selectedRouteData().shops;
    for (const shop of shops) {
      const items = this.selectedRouteData().foodCollectionData.items.filter(
        item => item.shopId === shop.id
      );

      if (items.length === 0) {
        return shop;
      }

      for (const category of this.foodCategories()) {
        const currentValue = this.getCurrentValue(items, category, shop);
        if (currentValue === 0) {
          return shop;
        }
      }
    }

    return shops[shops.length - 1];
  }

  save() {
    const routeId = this.selectedRouteData().route.id;
    const shopId = this.currentShop.id;

    const saveItemsRequest: FoodCollectionSaveItemsPerShopRequest = {
      items: this.foodCategories().map(category => {
        const item: FoodCollectionCategoryWithAmount = {
          categoryId: category.id,
          amount: this.categoryValues[category.id] || 0
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

    // TODO refresh selectedRouteData somehow after saving to have the latest data while navigating between shops
  }

  onValueChange(valueChange: TafelCounterInputValueChange) {
    this.categoryValues[valueChange.key as number] = valueChange.value;
    console.log("Value changed:", valueChange);
  }

  selectShop(shop: Shop) {
    for (const category of this.foodCategories()) {
      this.categoryValues[category.id] = this.getCurrentValue(
        this.selectedRouteData().foodCollectionData.items,
        category,
        shop
      );
    }
    this.currentShop = shop;
  }

  selectPreviousShop() {
    const shop = this.selectedRouteData().shops[this.selectedRouteData().shops.indexOf(this.currentShop) - 1];
    this.selectShop(shop);
  }

  selectNextShop() {
    const shop = this.selectedRouteData().shops[this.selectedRouteData().shops.indexOf(this.currentShop) + 1];
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
