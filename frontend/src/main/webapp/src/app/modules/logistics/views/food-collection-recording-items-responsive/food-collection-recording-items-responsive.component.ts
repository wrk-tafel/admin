import {Component, computed, DestroyRef, effect, inject, input, model, signal, untracked} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';

import {FoodCategory} from '../../../../api/food-categories-api.service';
import {FoodReturnCategory} from '../../../../api/food-return-categories-api.service';
import {FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatIcon} from '@angular/material/icon';
import {
  FoodCollectionCategoryWithAmount,
  FoodCollectionItem,
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
import {catchError, map, Observable, of, Subject, switchMap} from 'rxjs';
import {TabStatus} from '../../services/food-collection-tab-status';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import addIcon from '@material-symbols/svg-400/outlined/add-fill.svg';
import closeIcon from '@material-symbols/svg-400/outlined/close-fill.svg';

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
    MatIcon,
    TafelCounterInputComponent
  ]
})
export class FoodCollectionRecordingItemsResponsiveComponent {
  private readonly registerIcons = registerSvgIcons({add: addIcon, close: closeIcon});

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

  // markReturnItemsSaved() below calls markAsPristine(), which never emits valueChanges, and can
  // also leave returnCategoryValuesDirty unchanged (already false when only a free-text row was
  // edited) - bumped there instead so tabStatus always re-evaluates after a save.
  private readonly savedTick = signal(0);

  // The predefined return-category counters are signals, not a reactive form, so unlike returnItems
  // they need their own explicit dirty flag: set on every user edit, cleared once a shop's data has
  // been (re)loaded or successfully sent - see onReturnCategoryValueChange/applyReturnItems/markReturnItemsSaved.
  private readonly returnCategoryValuesDirty = signal(false);

  private syncConfirmationTimeoutId?: ReturnType<typeof setTimeout>;
  private previousPendingSyncCount = this.pendingSyncCount();
  /** True for a few seconds right after the offline queue has flushed, for a "Synchronisiert ✓" hint. */
  readonly justSynced = signal(false);

  // A slower earlier getItemsPerShop response could otherwise land after a faster later one (rapid
  // "Weiter" taps) or arrive once a route switch is already in progress and rebind edits to a wrong
  // (route, shop) pair (see #3527/#3530) - routing every load through this switchMap cancels a
  // still-pending older load the moment a newer one starts.
  private readonly shopSelectionTrigger = new Subject<{shop: Shop; routeId: number; shopId: number}>();

  constructor() {
    this.shopSelectionTrigger.pipe(
      switchMap(({shop, routeId, shopId}) => this.foodCollectionsApiService.getItemsPerShop(routeId, shopId).pipe(
        // `data` can legitimately be null/empty (e.g. a 204 for a shop with nothing recorded yet)
        // without the request having failed - keep that apart from an actual HTTP error below.
        map(data => ({shop, routeId, failed: false as const, data})),
        catchError(() => of({shop, routeId, failed: true as const, data: null}))
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({shop, routeId, failed, data}) => {
      // the route may have been switched away from while this request was in flight - the result
      // then belongs to a shop selection that is no longer shown, so it must not be applied
      if (this.selectedRouteData()?.route.id !== routeId) {
        return;
      }

      if (failed) {
        this.applyFallbackShopValues(shop, 'Laden fehlgeschlagen, zuletzt bekannter Stand wird angezeigt.');
      } else {
        this.applyShopValues(shop, data?.items ?? [], data?.returnItems ?? []);
      }
    });

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

  // The route + shop pairing whose data is currently on screen, captured together (not just the
  // shop) so a route switch can never send the outgoing shop's return items under the *new*
  // route's id - `selectedRouteData()` already points at the new route by the time selectShop()
  // is sending off the previous shop's data (see #3527).
  private currentSelection: {routeId: number; shopId: number} | null = null;

  // Last known values per shop for this session, used as a fallback while offline. Seeded from
  // the route-level snapshot on first read of a shop, refreshed on every successful live load,
  // and updated immediately on every local edit so a same-session change is never masked by a
  // stale fallback even before it's confirmed sent.
  private readonly shopValuesCache = new Map<number, Record<number, number>>();

  // Which route's data this effect last jumped to a shop for - a save on the parent screen
  // refreshes `selectedRouteData()` in place (new object, same route) so its snapshot stays
  // current, and that refresh must not re-run findNextUnfilledShop() and yank the codriver away
  // from whatever shop they're currently on.
  private lastLoadedRouteId?: number;

  // `untracked` because selecting a shop both reads and writes the value signals below - without
  // it the effect would re-run itself on every shop load
  loadEffect = effect(() => {
    const data = this.selectedRouteData();
    if (!data) {
      this.lastLoadedRouteId = undefined;
      return;
    }
    if (data.route.id === this.lastLoadedRouteId) {
      return;
    }

    this.lastLoadedRouteId = data.route.id;
    untracked(() => {
      const shop = this.findNextUnfilledShop();
      this.selectShop(shop);
    });
  });

  private findNextUnfilledShop(): Shop | undefined {
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

  selectShop(shop: Shop | undefined) {
    if (!this.selectedRouteData()) {
      return;
    }

    if (this.connectivityService.isOnline()()) {
      // the return boxes of the shop being left are only held in this component until they are
      // sent, so they have to go out before the form is repopulated for the next shop - checked
      // before attempting the send, not after, so an offline attempt never fires at all (see #3527)
      this.sendReturnItemsOfCurrentShop();
    } else {
      this.warnAboutUnsentReturnItems();
    }

    if (!shop) {
      // a route with no shops at all - nothing to load, so the form is simply reset instead of
      // dereferencing a shop that doesn't exist (see #3527)
      this.currentShop.set(null);
      this.currentSelection = null;
      this.categoryValues.set({});
      this.applyReturnItems([]);
      return;
    }

    const routeId = this.selectedRouteData()!.route.id;
    const shopId = shop.id;

    if (!this.connectivityService.isOnline()()) {
      this.applyFallbackShopValues(shop, 'Offline - zuletzt bekannter Stand wird angezeigt.');
      return;
    }

    this.shopSelectionTrigger.next({shop, routeId, shopId});
  }

  private sendReturnItemsOfCurrentShop() {
    // nothing to send if the form hasn't actually changed since it was last loaded/sent - also
    // what keeps switching shops/routes without touching the return boxes from firing a request
    // at all, now that `currentSelection` moving on no longer masks a stale route id (see #3527)
    if (!this.currentSelection || (this.returnItems.pristine && !this.returnCategoryValuesDirty())) {
      return;
    }

    // an invalid free-text row (empty description, duplicate name) is never sent - warn instead of
    // silently dropping it, since the form is about to be cleared for the next shop
    if (this.returnItems.invalid) {
      this.toastr.warning('Ungültige Retourware der vorherigen Filiale wurde nicht gespeichert und geht verloren!');
      return;
    }

    const sentSelection = this.currentSelection;
    const request = this.returnItemsSaveRequest(sentSelection);
    if (request) {
      request.subscribe({
        next: () => {
          // the shop on screen may already have moved on by the time this response arrives (a
          // faster getItemsPerShop load for the next shop can land first) - clearing dirty state
          // then would wipe edits already made to the *new* shop's return items, not the ones
          // this request actually sent (see #3628)
          if (this.currentSelection?.routeId === sentSelection?.routeId && this.currentSelection?.shopId === sentSelection?.shopId) {
            this.markReturnItemsSaved();
          }
        },
        error: () => {
          this.toastr.error('Retourware konnte nicht gespeichert werden!');
        }
      });
    }
  }

  /** Called instead of sending while offline - the unsent return boxes of the shop being left are about to be replaced. */
  private warnAboutUnsentReturnItems() {
    if (this.currentSelection && (this.returnItems.dirty || this.returnCategoryValuesDirty())) {
      this.toastr.warning('Offline - nicht gespeicherte Retourware der vorherigen Filiale geht verloren!');
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
    this.currentSelection = {routeId: this.selectedRouteData()!.route.id, shopId: shop.id};
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
    this.currentSelection = {routeId: this.selectedRouteData()!.route.id, shopId: shop.id};
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
    this.markReturnItemsSaved();
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

  /** The Warenmenge counters here are plain numbers with no validity state of their own - they auto-save through the offline queue. */
  hasInvalidItems(): boolean {
    return false;
  }

  /** Whether the free-text return rows (duplicate/missing description) are invalid. */
  hasInvalidReturnItems(): boolean {
    return this.returnItems.invalid;
  }

  markAllAsTouched() {
    this.returnItems.markAllAsTouched();
  }

  // Nothing to do for the Warenmenge counters: they auto-save through the offline queue and have
  // no local dirty/pristine state of their own.
  markItemsSaved() {
  }

  /**
   * Called once this section's own return data has actually gone out (shop switch or the main
   * "Speichern" button) - flips its badge back to "complete".
   */
  markReturnItemsSaved() {
    this.returnCategoryValuesDirty.set(false);
    this.returnItems.markAsPristine();
    this.savedTick.update(tick => tick + 1);
  }

  /** Badge shown on the "Waren" tab label - see {@link TabStatus}. */
  readonly tabStatus = computed<TabStatus | undefined>(() => {
    this.returnItemsChangeTick();
    this.savedTick();

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

    // the explicit "Speichern" button always sends whatever the shop currently on screen holds,
    // dirty or not - the dirty/pristine skip in sendReturnItemsOfCurrentShop() is specific to the
    // implicit send that happens while switching away from a shop/route
    const returnItemsRequest = this.returnItemsSaveRequest({routeId, shopId});
    if (returnItemsRequest) {
      requests.push(returnItemsRequest);
    }

    return requests;
  }

  private returnItemsSaveRequest(selection: {routeId: number; shopId: number} | null): Observable<void> | null {
    if (!selection || this.returnItems.invalid) {
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

    return this.foodCollectionsApiService.saveReturnItemsPerShop(selection.routeId, selection.shopId, request);
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

  protected readonly maxDescriptionLength = RETURN_ITEM_DESCRIPTION_MAX_LENGTH;
}
