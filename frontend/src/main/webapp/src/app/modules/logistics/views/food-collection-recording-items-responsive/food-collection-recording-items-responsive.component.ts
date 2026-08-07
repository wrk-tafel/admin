import {Component, computed, effect, inject, input, model, signal, untracked} from '@angular/core';

import {FoodCategory} from '../../../../api/food-categories-api.service';
import {FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faPlus, faRemove} from '@fortawesome/free-solid-svg-icons';
import {
  FoodCollectionCategoryWithAmount,
  FoodCollectionItem,
  FoodCollectionItemsPerShopResponse,
  FoodCollectionReturnItem,
  FoodCollectionReturnItemAmount,
  FoodCollectionsApiService,
  FoodCollectionSaveItemsPerShopRequest,
  FoodCollectionSaveReturnItemsPerShopRequest
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
import {
  duplicateDescriptionValidator,
  RETURN_ITEM_DESCRIPTION_MAX_LENGTH
} from '../../services/food-collection-return-items';
import {Observable} from 'rxjs';

@Component({
  selector: 'tafel-food-collection-recording-items-responsive',
  templateUrl: 'food-collection-recording-items-responsive.component.html',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FaIconComponent,
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
  returnCategoryValues = signal<Record<string, number>>({});

  private readonly foodCollectionsApiService = inject(FoodCollectionsApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly offlineQueueService = inject(FoodCollectionOfflineQueueService);
  private readonly connectivityService = inject(ConnectivityService);
  private readonly fb = inject(FormBuilder);

  protected readonly isOnline = this.connectivityService.isOnline();
  protected readonly pendingSyncCount = this.offlineQueueService.pendingCount;

  // Free-text return boxes of the shop currently shown. Unlike the counters above they are not
  // handed to the offline queue - they are sent for the shop being left in selectShop() and by the
  // screen's save button.
  returnItems: FormArray = this.fb.array([]);

  // attached lazily rather than at construction: the validator reads `foodCategories`, which is a
  // required model input and therefore not available while the form array is being built
  private attachReturnItemsValidator() {
    this.returnItems.setValidators([
      duplicateDescriptionValidator(() => this.foodCategoriesReturn().map(category => category.name))
    ]);
  }

  // Last known values per shop for this session, used as a fallback while offline. Seeded from
  // the route-level snapshot on first read of a shop, refreshed on every successful live load,
  // and updated immediately on every local edit so a same-session change is never masked by a
  // stale fallback even before it's confirmed sent.
  private readonly shopValuesCache = new Map<number, Record<number, number>>();

  // `untracked` because selecting a shop both reads and writes the value signals below - without
  // it the effect would re-run itself on every shop load
  loadEffect = effect(() => {
    if (this.selectedRouteData()) {
      untracked(() => {
        const shop = this.findNextUnfilledShop();
        this.selectShop(shop);
      });
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

      for (const category of this.foodCategoriesItems()) {
        const currentValue = this.getCurrentValue(itemsPerShop, category, shop);
        if (currentValue === 0) {
          return shop;
        }
      }
    }

    return shops[shops.length - 1];
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

  onReturnCategoryValueChange(valueChange: TafelCounterInputValueChange) {
    this.returnCategoryValues.update(values => ({
      ...values,
      [valueChange.key as string]: valueChange.value
    }));
  }

  addReturnItem(description = '', amount = 1) {
    this.attachReturnItemsValidator();
    this.returnItems.push(
      this.fb.group({
        description: this.fb.control<string>(description, {
          nonNullable: true,
          validators: [Validators.required, Validators.maxLength(RETURN_ITEM_DESCRIPTION_MAX_LENGTH)]
        }),
        amount: this.fb.control<number>(amount, [Validators.required, Validators.min(1)]),
      })
    );
    this.returnItems.updateValueAndValidity();
  }

  removeReturnItem(index: number) {
    this.returnItems.removeAt(index);
    this.returnItems.updateValueAndValidity();
  }

  selectShop(shop: Shop) {
    if (!this.selectedRouteData()) {
      return;
    }

    const routeId = this.selectedRouteData()!.route.id;
    const shopId = shop.id;

    // the return boxes of the shop being left are only held in this component until they are sent,
    // so they have to go out before the form is repopulated for the next shop
    this.sendReturnItemsOfCurrentShop();

    if (!this.connectivityService.isOnline()()) {
      this.applyFallbackShopValues(shop, 'Offline - zuletzt bekannter Stand wird angezeigt.');
      return;
    }

    const observer = {
      next: (data: FoodCollectionItemsPerShopResponse) => {
        this.applyShopValues(shop, data?.items ?? [], data?.returnItems ?? []);
      },
      error: () => {
        this.applyFallbackShopValues(shop, 'Laden fehlgeschlagen, zuletzt bekannter Stand wird angezeigt.');
      }
    };
    this.foodCollectionsApiService.getItemsPerShop(routeId, shopId).subscribe(observer);
  }

  private sendReturnItemsOfCurrentShop() {
    const request = this.returnItemsSaveRequest();
    if (request) {
      request.subscribe({
        error: () => {
          this.toastr.error('Retourware konnte nicht gespeichert werden!');
        }
      });
    }
  }

  private applyShopValues(shop: Shop, items: FoodCollectionItem[], returnItems: FoodCollectionReturnItem[]) {
    const newValues: Record<number, number> = {};
    for (const category of this.foodCategoriesItems()) {
      newValues[category.id] = this.getCurrentValue(items, category, shop);
    }
    this.mergePendingValues(shop, newValues);

    this.shopValuesCache.set(shop.id, newValues);
    this.categoryValues.set(newValues);
    this.applyReturnItems(returnItems);
    this.currentShop.set(shop);
  }

  private applyFallbackShopValues(shop: Shop, warningMessage: string) {
    const initialItems = this.selectedRouteData()!.foodCollectionData?.items ?? [];
    const cached = this.shopValuesCache.get(shop.id);

    const newValues: Record<number, number> = {...cached};
    if (!cached) {
      for (const category of this.foodCategoriesItems()) {
        newValues[category.id] = this.getCurrentValue(initialItems, category, shop);
      }
    }
    this.mergePendingValues(shop, newValues);

    this.categoryValues.set(newValues);
    this.applyReturnItems(
      (this.selectedRouteData()!.foodCollectionData?.returnItems ?? []).filter(item => item.shopId === shop.id)
    );
    this.currentShop.set(shop);
    this.toastr.warning(warningMessage);
  }

  private applyReturnItems(returnItems: FoodCollectionReturnItem[]) {
    const returnCategoryNames = this.foodCategoriesReturn().map(category => category.name);

    const newReturnValues: Record<string, number> = {};
    for (const name of returnCategoryNames) {
      newReturnValues[name] = returnItems.find(item => item.description === name)?.amount ?? 0;
    }
    this.returnCategoryValues.set(newReturnValues);

    this.returnItems.clear();
    returnItems
      .filter(item => !returnCategoryNames.includes(item.description))
      .forEach(item => this.addReturnItem(item.description, item.amount));
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

  hasInvalidInput(): boolean {
    return this.returnItems.invalid;
  }

  markAllAsTouched() {
    this.returnItems.markAllAsTouched();
  }

  saveRequests(): Observable<void>[] {
    if (!this.selectedRouteData() || !this.currentShop()) {
      return [];
    }

    const routeId = this.selectedRouteData()!.route.id;
    const shopId = this.currentShop()!.id;
    const values = this.categoryValues();

    const saveItemsRequest: FoodCollectionSaveItemsPerShopRequest = {
      items: this.foodCategoriesItems().map(category => {
        const item: FoodCollectionCategoryWithAmount = {
          categoryId: category.id,
          amount: values[category.id] || 0
        };
        return item;
      })
    };

    const requests = [this.foodCollectionsApiService.saveItemsPerShop(routeId, shopId, saveItemsRequest)];

    const returnItemsRequest = this.returnItemsSaveRequest();
    if (returnItemsRequest) {
      requests.push(returnItemsRequest);
    }

    return requests;
  }

  private returnItemsSaveRequest(): Observable<void> | null {
    if (!this.selectedRouteData() || !this.currentShop() || this.returnItems.invalid) {
      return null;
    }

    const returnCategoryValues = this.returnCategoryValues();
    const fromCategories: FoodCollectionReturnItemAmount[] = this.foodCategoriesReturn().map(category => ({
      description: category.name,
      amount: returnCategoryValues[category.name] || 0
    }));
    const freetext: FoodCollectionReturnItemAmount[] = this.returnItems.controls.map(control => ({
      description: control.get('description')!.value,
      amount: control.get('amount')!.value
    }));

    const request: FoodCollectionSaveReturnItemsPerShopRequest = {
      returnItems: [...fromCategories, ...freetext].filter(returnItem => returnItem.amount > 0)
    };

    return this.foodCollectionsApiService.saveReturnItemsPerShop(
      this.selectedRouteData()!.route.id,
      this.currentShop()!.id,
      request
    );
  }

  private getCurrentValue(items: FoodCollectionItem[], category: FoodCategory, shop: Shop) {
    const filteredItems = items.filter(data => data.categoryId === category.id && data.shopId === shop.id);
    if (filteredItems.length === 1) {
      return filteredItems[0].amount;
    }
    return 0;
  }

  getReturnItemGroup(index: number): FormGroup {
    return this.returnItems.at(index) as FormGroup;
  }

  protected readonly faPlus = faPlus;
  protected readonly faRemove = faRemove;
  protected readonly maxDescriptionLength = RETURN_ITEM_DESCRIPTION_MAX_LENGTH;
}
