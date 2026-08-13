import {Component, computed, DestroyRef, effect, inject, input, model, signal, untracked} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';

import {FoodCategory} from '../../../../api/food-categories-api.service';
import {FoodReturnCategory} from '../../../../api/food-return-categories-api.service';
import {FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
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
import {TabStatus} from '../../services/food-collection-tab-status';

// How long the "Synchronisiert ✓" confirmation stays up once the offline queue has emptied out -
// long enough to notice, short enough not to linger once it's no longer news.
const SYNC_CONFIRMATION_DURATION_MS = 4000;

@Component({
  selector: 'tafel-food-collection-recording-items-responsive',
  templateUrl: 'food-collection-recording-items-responsive.component.html',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FaIconComponent,
    TafelCounterInputComponent
  ]
})
export class FoodCollectionRecordingItemsResponsiveComponent {
  foodCategories = model.required<FoodCategory[]>();
  foodReturnCategories = model.required<FoodReturnCategory[]>();
  selectedRouteData = input<SelectedRouteData>();

  currentShop = signal<Shop | null>(null);
  categoryValues = signal<Record<number, number>>({});
  returnCategoryValues = signal<Record<string, number>>({});

  private readonly foodCollectionsApiService = inject(FoodCollectionsApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly offlineQueueService = inject(FoodCollectionOfflineQueueService);
  private readonly connectivityService = inject(ConnectivityService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isOnline = this.connectivityService.isOnline();
  protected readonly pendingSyncCount = this.offlineQueueService.pendingCount;

  // Free-text return boxes of the shop currently shown. Unlike the counters above they are not
  // handed to the offline queue - they are sent for the shop being left in selectShop() and by the
  // screen's save button.
  returnItems: FormArray = this.fb.array([]);

  // Recompute trigger for returnItems.dirty below - a plain FormArray property, not a signal.
  private readonly returnItemsChangeTick = toSignal(this.returnItems.valueChanges, {initialValue: null});

  // The predefined return-category counters are signals, not a reactive form, so unlike returnItems
  // they need their own explicit dirty flag: set on every user edit, cleared once a shop's data has
  // been (re)loaded or successfully sent - see onReturnCategoryValueChange/applyReturnItems/markAsSaved.
  private readonly returnCategoryValuesDirty = signal(false);

  private syncConfirmationTimeoutId?: ReturnType<typeof setTimeout>;
  private previousPendingSyncCount = this.pendingSyncCount();
  /** True for a few seconds right after the offline queue has flushed, for a "Synchronisiert ✓" hint. */
  readonly justSynced = signal(false);

  constructor() {
    // Only a transition from "something was pending" to "nothing is" counts as a sync just having
    // happened - a route that has always had nothing queued must not show this on load.
    effect(() => {
      const pending = this.pendingSyncCount();
      if (this.previousPendingSyncCount > 0 && pending === 0) {
        this.justSynced.set(true);
        clearTimeout(this.syncConfirmationTimeoutId);
        this.syncConfirmationTimeoutId = setTimeout(() => this.justSynced.set(false), SYNC_CONFIRMATION_DURATION_MS);
      }
      this.previousPendingSyncCount = pending;
    });
    this.destroyRef.onDestroy(() => clearTimeout(this.syncConfirmationTimeoutId));
  }

  // attached lazily rather than at construction: the validator reads `foodCategories`, which is a
  // required model input and therefore not available while the form array is being built
  private attachReturnItemsValidator() {
    this.returnItems.setValidators([
      duplicateDescriptionValidator(() => this.foodReturnCategories().map(category => category.name))
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

      for (const category of this.foodCategories()) {
        const currentValue = this.getCurrentValue(itemsPerShop, category, shop);
        if (currentValue === 0) {
          return shop;
        }
      }
    }

    return shops[shops.length - 1];
  }

  /** 1-based position of the shop on screen, for the "Filiale 3 von 8" progress label. */
  readonly currentShopIndex = computed(() => {
    const shops = this.selectedRouteData()?.shops ?? [];
    const current = this.currentShop();
    return current ? shops.indexOf(current) : -1;
  });

  readonly shopCount = computed(() => this.selectedRouteData()?.shops?.length ?? 0);

  /** One entry per shop of the route, for the jump list and the per-shop "erfasst" checkmark. */
  readonly shopProgress = computed(() => {
    const shops = this.selectedRouteData()?.shops ?? [];
    const current = this.currentShop();
    // dependencies of isShopRecorded() that aren't read through a parameter of it
    this.categoryValues();
    return shops.map((shop, index) => ({
      shop,
      position: index + 1,
      isCurrent: shop.id === current?.id,
      isRecorded: this.isShopRecorded(shop)
    }));
  });

  /**
   * A shop counts as recorded once every food category has an amount greater than 0 for it - the
   * same rule {@link findNextUnfilledShop} uses to jump to the next open one, reused here for the
   * per-shop "erfasst" mark. Prefers whatever is currently known for the shop in this session
   * (the live counters for the shop on screen, the session cache for any other) over the
   * route-level snapshot, which goes stale the moment a shop is edited.
   */
  private isShopRecorded(shop: Shop): boolean {
    const sessionValues = this.currentShop()?.id === shop.id ? this.categoryValues() : this.shopValuesCache.get(shop.id);
    if (sessionValues) {
      return this.foodCategories().every(category => (sessionValues[category.id] ?? 0) > 0);
    }

    const items = (this.selectedRouteData()?.foodCollectionData?.items ?? []).filter(item => item.shopId === shop.id);
    if (items.length === 0) {
      return false;
    }
    return this.foodCategories().every(category => this.getCurrentValue(items, category, shop) > 0);
  }

  /** Whether the shop currently on screen already has an amount for every food category. */
  readonly currentShopRecorded = computed(() => this.shopProgress().find(entry => entry.isCurrent)?.isRecorded ?? false);

  /** Jumps directly to any shop of the route, from the position dropdown. */
  jumpToShop(shopId: number) {
    const shop = this.selectedRouteData()?.shops?.find(candidate => candidate.id === shopId);
    if (shop) {
      this.selectShop(shop);
    }
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
    this.returnCategoryValuesDirty.set(true);
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
        next: () => this.markAsSaved(),
        error: () => {
          this.toastr.error('Retourware konnte nicht gespeichert werden!');
        }
      });
    }
  }

  private applyShopValues(shop: Shop, items: FoodCollectionItem[], returnItems: FoodCollectionReturnItem[]) {
    const newValues: Record<number, number> = {};
    for (const category of this.foodCategories()) {
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
      for (const category of this.foodCategories()) {
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
    const returnCategoryNames = this.foodReturnCategories().map(category => category.name);

    const newReturnValues: Record<string, number> = {};
    for (const name of returnCategoryNames) {
      newReturnValues[name] = returnItems.find(item => item.description === name)?.amount ?? 0;
    }
    this.returnCategoryValues.set(newReturnValues);

    this.returnItems.clear();
    returnItems
      .filter(item => !returnCategoryNames.includes(item.description))
      .forEach(item => this.addReturnItem(item.description, item.amount));

    // freshly (re)loaded from the server/cache, so nothing here is an unsent local change yet
    this.markAsSaved();
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

  /**
   * Called once a section's own return data has actually gone out (shop switch or the main
   * "Speichern" button) - flips its badge back to "complete". The Warenmenge counters are not
   * reset here: they auto-save through the offline queue, so `pendingSyncCount` alone already
   * tracks whether they're sent.
   */
  markAsSaved() {
    this.returnCategoryValuesDirty.set(false);
    this.returnItems.markAsPristine();
  }

  /** Badge shown on the "Waren" tab label - see {@link TabStatus}. */
  readonly tabStatus = computed<TabStatus | undefined>(() => {
    this.returnItemsChangeTick();

    const pending = this.pendingSyncCount();
    const hasCategoryData = Object.values(this.categoryValues()).some(value => value > 0);
    const hasReturnData = Object.values(this.returnCategoryValues()).some(value => value > 0) || this.returnItems.length > 0;
    if (!hasCategoryData && !hasReturnData && pending === 0) {
      return undefined;
    }
    if (this.returnItems.invalid) {
      return 'invalid';
    }
    if (pending > 0 || this.returnItems.dirty || this.returnCategoryValuesDirty()) {
      return 'unsaved';
    }
    return 'complete';
  });

  saveRequests(): Observable<void>[] {
    if (!this.selectedRouteData() || !this.currentShop()) {
      return [];
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
    const fromCategories: FoodCollectionReturnItemAmount[] = this.foodReturnCategories().map(category => ({
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
