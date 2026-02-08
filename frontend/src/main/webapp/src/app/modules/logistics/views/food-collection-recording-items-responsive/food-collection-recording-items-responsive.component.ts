import {Component, effect, inject, input, model} from '@angular/core';
import {CommonModule} from '@angular/common';
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
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        ButtonDirective,
        RowComponent,
        ColComponent,
        TafelCounterInputComponent,
    ]
})
export class FoodCollectionRecordingItemsResponsiveComponent {
  foodCategories = model.required<FoodCategory[]>();
  selectedRouteData = input<SelectedRouteData>();

  foodCategoriesItems: FoodCategory[] = [];
  foodCategoriesReturn: FoodCategory[] = [];
  currentShop: Shop;
  categoryValues: Record<number, number> = {};

  private readonly foodCollectionsApiService = inject(FoodCollectionsApiService);
  private readonly toastService = inject(ToastService);

  loadEffect = effect(() => {
    const shop = this.findNextUnfilledShop();
    this.selectShop(shop);

    this.foodCategories().forEach(category => {
      if (category.returnItem) {
        this.foodCategoriesReturn.push(category);
      } else {
        this.foodCategoriesItems.push(category);
      }
    });
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
  }

  onValueChange(valueChange: TafelCounterInputValueChange) {
    const routeId = this.selectedRouteData().route.id;
    const shopId = this.currentShop.id;

    this.categoryValues[valueChange.key as number] = valueChange.value;

    const data: FoodCollectionItem = {
      categoryId: valueChange.key as number,
      shopId: shopId,
      amount: valueChange.value
    };
    this.foodCollectionsApiService.patchItems(routeId, data).subscribe();
  }

  selectShop(shop: Shop) {
    const routeId = this.selectedRouteData().route.id;
    const shopId = shop.id;

    const observer = {
      next: (data) => {
        for (const category of this.foodCategories()) {
          this.categoryValues[category.id] = this.getCurrentValue(
            data?.items ?? [],
            category,
            shop
          );
        }
        this.currentShop = shop;
      },
      error: (error: any) => {
        this.toastService.showToast({type: ToastType.ERROR, title: 'Laden fehlgeschlagen!'});
      }
    };
    this.foodCollectionsApiService.getItemsPerShop(routeId, shopId).subscribe(observer);
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
