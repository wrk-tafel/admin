import {TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {FoodCollectionRecordingItemsResponsiveComponent} from './food-collection-recording-items-responsive.component';
import {FoodCollectionsApiService} from '../../../../api/food-collections-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {FoodCollectionOfflineQueueService} from '../../services/food-collection-offline-queue.service';
import {ConnectivityService} from '../../../../common/connectivity/connectivity.service';
import {signal} from '@angular/core';
import {of} from 'rxjs';

describe('FoodCollectionRecordingItemsResponsiveComponent', () => {
  let offlineQueueService: {
    enqueue: ReturnType<typeof vi.fn>;
    getPendingForShop: ReturnType<typeof vi.fn>;
    pendingCount: ReturnType<typeof signal<number>>;
  };
  let onlineSignal: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    offlineQueueService = {
      enqueue: vi.fn(),
      getPendingForShop: vi.fn().mockReturnValue([]),
      pendingCount: signal(0)
    };
    onlineSignal = signal(true);

    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule
      ],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: TafelToastrService, useValue: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn(), show: vi.fn() } },
        { provide: FoodCollectionOfflineQueueService, useValue: offlineQueueService },
        { provide: ConnectivityService, useValue: { isOnline: () => onlineSignal.asReadonly() } }
      ]
    }).compileComponents();
  });

  const mockFoodCategories = [
    {id: 1, name: 'Category 1'},
    {id: 2, name: 'Category 2'}
  ];
  const mockFoodReturnCategories = [
    {id: 3, name: 'Graue Kisten', sortOrder: 1, enabled: true}
  ];
  const mockShops = [
    {id: 101, number: 1, name: 'Shop 1', address: 'Address 1'},
    {id: 102, number: 2, name: 'Shop 2', address: 'Address 2'},
    {id: 103, number: 3, name: 'Shop 3', address: 'Address 3'}
  ];
  const mockRoute = {id: 201, name: 'Route 1'};

  it('component can be created', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should select next unfilled shop when initialized', () => {
    const mockRouteData = {
      route: mockRoute,
      shops: mockShops,
      foodCollectionData: {
        items: [
          {
            shopId: mockShops[0].id,
            categoryId: mockFoodCategories[0].id,
            amount: 2
          },
          {
            shopId: mockShops[0].id,
            categoryId: mockFoodCategories[1].id,
            amount: 4
          }
        ]
      }
    };

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;
    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', mockRouteData);

    const selectShopSpy = vi.spyOn(component, 'selectShop');

    fixture.detectChanges();

    expect(selectShopSpy).toHaveBeenCalledWith(mockShops[1]);
  });

  it('should call api service to save items when saveRequests is called', () => {
    const mockRouteData = {
      route: mockRoute,
      shops: mockShops,
      foodCollectionData: {items: []}
    };

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', mockRouteData);

    component.currentShop.set(mockShops[0]);
    component.categoryValues.set({1: 3, 2: 5});

    const apiService = TestBed.inject(FoodCollectionsApiService);
    const saveItemsSpy = vi.spyOn(apiService, 'saveItemsPerShop').mockReturnValue(of(undefined));
    vi.spyOn(apiService, 'saveReturnItemsPerShop').mockReturnValue(of(undefined));

    expect(component.saveRequests()).toHaveLength(2);

    expect(saveItemsSpy).toHaveBeenCalledWith(
      mockRoute.id,
      mockShops[0].id,
      {
        items: [
          {categoryId: 1, amount: 3},
          {categoryId: 2, amount: 5}
        ]
      }
    );
  });

  it('should send return category counters and free-text rows for the current shop', () => {
    const mockRouteData = {
      route: mockRoute,
      shops: mockShops,
      foodCollectionData: {items: []}
    };

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', mockRouteData);

    component.currentShop.set(mockShops[0]);
    component.onReturnCategoryValueChange({key: 'Graue Kisten', value: 4});
    component.addReturnItem('Bananenkartons', 2);

    const apiService = TestBed.inject(FoodCollectionsApiService);
    vi.spyOn(apiService, 'saveItemsPerShop').mockReturnValue(of(undefined));
    const saveReturnItemsSpy = vi.spyOn(apiService, 'saveReturnItemsPerShop').mockReturnValue(of(undefined));

    component.saveRequests();

    expect(saveReturnItemsSpy).toHaveBeenCalledWith(
      mockRoute.id,
      mockShops[0].id,
      {
        returnItems: [
          {description: 'Graue Kisten', amount: 4},
          {description: 'Bananenkartons', amount: 2}
        ]
      }
    );
  });

  it('should reject a free-text row duplicating a return category', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', {route: mockRoute, shops: mockShops, foodCollectionData: {items: []}});

    component.currentShop.set(mockShops[0]);
    component.addReturnItem('graue kisten', 2);

    expect(component.hasInvalidInput()).toBe(true);

    const apiService = TestBed.inject(FoodCollectionsApiService);
    vi.spyOn(apiService, 'saveItemsPerShop').mockReturnValue(of(undefined));
    const saveReturnItemsSpy = vi.spyOn(apiService, 'saveReturnItemsPerShop');

    expect(component.saveRequests()).toHaveLength(1);
    expect(saveReturnItemsSpy).not.toHaveBeenCalled();
  });

  it('sends the return items of the shop being left before loading the next one', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', {route: mockRoute, shops: mockShops, foodCollectionData: {items: []}});

    component.currentShop.set(mockShops[0]);
    // populated the way applyShopValues()/applyFallbackShopValues() would after actually loading
    // shop 0 - selectShop() only sends a shop's return items for a pairing it captured itself
    (component as any).currentSelection = {routeId: mockRoute.id, shopId: mockShops[0].id};
    component.addReturnItem('Bananenkartons', 2);
    // addReturnItem() alone doesn't mark the form dirty (only real user input does) - mark it as if
    // the user had actually typed the row in, since sendReturnItemsOfCurrentShop() now skips a
    // pristine form
    component.returnItems.markAsDirty();

    const apiService = TestBed.inject(FoodCollectionsApiService);
    const saveReturnItemsSpy = vi.spyOn(apiService, 'saveReturnItemsPerShop').mockReturnValue(of(undefined));
    vi.spyOn(apiService, 'getItemsPerShop').mockReturnValue(of({items: [], returnItems: []}) as any);

    component.selectShop(mockShops[1]);

    expect(saveReturnItemsSpy).toHaveBeenCalledWith(
      mockRoute.id,
      mockShops[0].id,
      {returnItems: [{description: 'Bananenkartons', amount: 2}]}
    );
    // the newly loaded shop starts from a clean slate
    expect(component.returnItems.length).toBe(0);
  });

  it('sends the outgoing shop\'s return items under its own route, not the newly selected route', () => {
    // Regression test for #3527: selectedRouteData() already points at the new route by the time
    // the outgoing shop's return items are sent, so the request must not be built from it.
    const otherRoute = {id: 999, name: 'Other Route'};
    const otherShop = {id: 888, number: 9, name: 'Other Shop', address: 'Other Address'};

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', {route: mockRoute, shops: mockShops, foodCollectionData: {items: []}});

    component.currentShop.set(mockShops[0]);
    (component as any).currentSelection = {routeId: mockRoute.id, shopId: mockShops[0].id};
    component.addReturnItem('Bananenkartons', 2);
    component.returnItems.markAsDirty();

    const apiService = TestBed.inject(FoodCollectionsApiService);
    const saveReturnItemsSpy = vi.spyOn(apiService, 'saveReturnItemsPerShop').mockReturnValue(of(undefined));
    vi.spyOn(apiService, 'getItemsPerShop').mockReturnValue(of({items: [], returnItems: []}) as any);

    // simulates the parent switching selectedRouteData to a different route before this component's
    // loadEffect re-runs and calls selectShop() for the new route's first shop
    componentRef.setInput('selectedRouteData', {route: otherRoute, shops: [otherShop], foodCollectionData: {items: []}});
    component.selectShop(otherShop);

    expect(saveReturnItemsSpy).toHaveBeenCalledWith(
      mockRoute.id,
      mockShops[0].id,
      {returnItems: [{description: 'Bananenkartons', amount: 2}]}
    );
  });

  it('splits loaded return items into known counters and free-text rows', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', {route: mockRoute, shops: mockShops, foodCollectionData: {items: []}});

    const apiService = TestBed.inject(FoodCollectionsApiService);
    vi.spyOn(apiService, 'getItemsPerShop').mockReturnValue(of({
      items: [],
      returnItems: [
        {shopId: mockShops[1].id, description: 'Graue Kisten', amount: 5},
        {shopId: mockShops[1].id, description: 'Bananenkartons', amount: 2}
      ]
    }) as any);

    component.selectShop(mockShops[1]);

    expect(component.returnCategoryValues()['Graue Kisten']).toBe(5);
    expect(component.returnItems.length).toBe(1);
    expect(component.returnItems.at(0).get('description')!.value).toBe('Bananenkartons');
    expect(component.returnItems.at(0).get('amount')!.value).toBe(2);
  });

  it('should update categoryValues and enqueue the change via the offline queue when onValueChange is called', () => {
    const mockRouteData = {
      route: mockRoute,
      shops: mockShops,
      foodCollectionData: {items: []}
    };

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', mockRouteData);

    component.currentShop.set(mockShops[0]);

    const valueChange = {
      key: mockFoodCategories[0].id,
      value: 7
    };

    component.onValueChange(valueChange);

    expect(component.categoryValues()[mockFoodCategories[0].id]).toBe(7);
    expect(offlineQueueService.enqueue).toHaveBeenCalledWith(
      mockRoute.id,
      mockShops[0].id,
      mockFoodCategories[0].id,
      7
    );
  });

  it('should load shop data and initialize categoryValues when selectShop is called', () => {
    const mockRouteData = {
      route: mockRoute,
      shops: mockShops,
      foodCollectionData: {items: []}
    };

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', mockRouteData);

    const mockItemsData = {
      items: [
        {
          shopId: mockShops[1].id,
          categoryId: mockFoodCategories[0].id,
          amount: 3
        }
      ]
    };

    const apiService = TestBed.inject(FoodCollectionsApiService);
    const getItemsSpy = vi.spyOn(apiService, 'getItemsPerShop').mockReturnValue({
      subscribe: (observer: any) => {
        observer.next(mockItemsData);
      }
    } as any);

    component.selectShop(mockShops[1]);

    expect(getItemsSpy).toHaveBeenCalledWith(mockRoute.id, mockShops[1].id);
    expect(component.currentShop()).toBe(mockShops[1]);
    expect(component.categoryValues()[mockFoodCategories[0].id]).toBe(3);
    expect(component.categoryValues()[mockFoodCategories[1].id]).toBe(0);
  });

  it('falls back to the route-level snapshot and shows a warning when selectShop fails', () => {
    const mockRouteData = {
      route: mockRoute,
      shops: mockShops,
      foodCollectionData: {
        items: [
          {shopId: mockShops[1].id, categoryId: mockFoodCategories[0].id, amount: 6}
        ]
      }
    };

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', mockRouteData);

    const apiService = TestBed.inject(FoodCollectionsApiService);
    vi.spyOn(apiService, 'getItemsPerShop').mockReturnValue({
      subscribe: (observer: any) => {
        observer.error('Error loading data');
      }
    } as any);

    const toastr = TestBed.inject(TafelToastrService);
    const toastSpy = vi.spyOn(toastr, 'warning');

    component.selectShop(mockShops[1]);

    expect(component.currentShop()).toBe(mockShops[1]);
    expect(component.categoryValues()[mockFoodCategories[0].id]).toBe(6);
    expect(toastSpy).toHaveBeenCalledWith('Laden fehlgeschlagen, zuletzt bekannter Stand wird angezeigt.');
  });

  it('skips the live request and uses the fallback directly when offline', () => {
    const mockRouteData = {
      route: mockRoute,
      shops: mockShops,
      foodCollectionData: {
        items: [
          {shopId: mockShops[1].id, categoryId: mockFoodCategories[0].id, amount: 6}
        ]
      }
    };

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', mockRouteData);

    onlineSignal.set(false);

    const apiService = TestBed.inject(FoodCollectionsApiService);
    const getItemsSpy = vi.spyOn(apiService, 'getItemsPerShop');

    const toastr = TestBed.inject(TafelToastrService);
    const toastSpy = vi.spyOn(toastr, 'warning');

    component.selectShop(mockShops[1]);

    expect(getItemsSpy).not.toHaveBeenCalled();
    expect(component.currentShop()).toBe(mockShops[1]);
    expect(component.categoryValues()[mockFoodCategories[0].id]).toBe(6);
    expect(toastSpy).toHaveBeenCalledWith('Offline - zuletzt bekannter Stand wird angezeigt.');
  });

  it('prefers a same-session local edit over the stale route-level snapshot in the offline fallback', () => {
    const mockRouteData = {
      route: mockRoute,
      shops: mockShops,
      foodCollectionData: {
        items: [
          {shopId: mockShops[0].id, categoryId: mockFoodCategories[0].id, amount: 6}
        ]
      }
    };

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', mockRouteData);

    // Edit shop 1 while online (goes through the normal enqueue path)...
    component.currentShop.set(mockShops[0]);
    component.onValueChange({key: mockFoodCategories[0].id, value: 42});

    // ...then go offline and switch away and back to shop 1.
    onlineSignal.set(false);
    component.selectShop(mockShops[0]);

    expect(component.categoryValues()[mockFoodCategories[0].id]).toBe(42);
  });

  it('overlays not-yet-sent queued items on top of the offline fallback', () => {
    const mockRouteData = {
      route: mockRoute,
      shops: mockShops,
      foodCollectionData: {items: []}
    };

    offlineQueueService.getPendingForShop.mockReturnValue([
      {categoryId: mockFoodCategories[0].id, shopId: mockShops[1].id, amount: 11}
    ]);

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', mockRouteData);

    onlineSignal.set(false);
    component.selectShop(mockShops[1]);

    expect(component.categoryValues()[mockFoodCategories[0].id]).toBe(11);
  });

  it('should navigate to previous shop correctly', () => {
    const mockRouteData = {
      route: mockRoute,
      shops: mockShops,
      foodCollectionData: {items: []}
    };

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', mockRouteData);

    component.currentShop.set(mockShops[1]); // start at middle shop

    const selectShopSpy = vi.spyOn(component, 'selectShop');

    component.selectPreviousShop();

    expect(selectShopSpy).toHaveBeenCalledWith(mockShops[0]);
  });

  it('does not show the offline indicator when online with nothing pending', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', {route: mockRoute, shops: mockShops, foodCollectionData: {items: []}});

    fixture.detectChanges();

    const indicator = (fixture.nativeElement as HTMLElement).querySelector('[testid="offline-indicator"]');
    expect(indicator).toBeNull();
  });

  it('shows an offline indicator without a pending count when offline with nothing queued', () => {
    onlineSignal.set(false);

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', {route: mockRoute, shops: mockShops, foodCollectionData: {items: []}});

    fixture.detectChanges();

    const indicator = (fixture.nativeElement as HTMLElement).querySelector('[testid="offline-indicator"]');
    expect(indicator?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Offline');
  });

  it('shows the pending count in the offline indicator while offline', () => {
    onlineSignal.set(false);
    offlineQueueService.pendingCount.set(3);

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', {route: mockRoute, shops: mockShops, foodCollectionData: {items: []}});

    fixture.detectChanges();

    const indicator = (fixture.nativeElement as HTMLElement).querySelector('[testid="offline-indicator"]');
    expect(indicator?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Offline - 3 Änderungen ausstehend, wird automatisch synchronisiert');
  });

  it('does not show any indicator while online even with items still pending, to avoid flicker on every save', () => {
    offlineQueueService.pendingCount.set(1);

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', {route: mockRoute, shops: mockShops, foodCollectionData: {items: []}});

    fixture.detectChanges();

    const indicator = (fixture.nativeElement as HTMLElement).querySelector('[testid="offline-indicator"]');
    expect(indicator).toBeNull();
  });

  it('currentShopIndex/shopProgress - reports the position and per-shop recorded state', () => {
    const mockRouteData = {
      route: mockRoute,
      shops: mockShops,
      foodCollectionData: {
        items: [
          {shopId: mockShops[0].id, categoryId: mockFoodCategories[0].id, amount: 1},
          {shopId: mockShops[0].id, categoryId: mockFoodCategories[1].id, amount: 1}
        ]
      }
    };

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', mockRouteData);

    component.currentShop.set(mockShops[1]);

    expect(component.currentShopIndex()).toBe(1);
    expect(component.shopCount()).toBe(3);

    const progress = component.shopProgress();
    expect(progress.map(entry => entry.position)).toEqual([1, 2, 3]);
    expect(progress[0].isRecorded).toBe(true); // every category has an amount > 0
    expect(progress[1].isRecorded).toBe(false); // the current shop, nothing entered yet
    expect(progress[1].isCurrent).toBe(true);
  });

  it('jumpToShop - selects the shop matching the given id', () => {
    const mockRouteData = {route: mockRoute, shops: mockShops, foodCollectionData: {items: []}};

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', mockRouteData);

    const selectShopSpy = vi.spyOn(component, 'selectShop');

    component.jumpToShop(mockShops[2].id);

    expect(selectShopSpy).toHaveBeenCalledWith(mockShops[2]);
  });

  it('justSynced - flips true once the offline queue empties out, then clears itself', () => {
    vi.useFakeTimers();
    try {
      offlineQueueService.pendingCount.set(2);

      const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
      const componentRef = fixture.componentRef;
      componentRef.setInput('foodCategories', mockFoodCategories);
      componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
      componentRef.setInput('selectedRouteData', {route: mockRoute, shops: mockShops, foodCollectionData: {items: []}});

      fixture.detectChanges();
      expect(fixture.componentInstance.justSynced()).toBe(false);

      offlineQueueService.pendingCount.set(0);
      fixture.detectChanges();
      expect(fixture.componentInstance.justSynced()).toBe(true);

      vi.advanceTimersByTime(5000);
      expect(fixture.componentInstance.justSynced()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('justSynced - stays false when nothing was ever pending', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const componentRef = fixture.componentRef;
    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', {route: mockRoute, shops: mockShops, foodCollectionData: {items: []}});

    fixture.detectChanges();

    expect(fixture.componentInstance.justSynced()).toBe(false);
  });

  it('tabStatus - unsaved while return boxes are pending, complete once markAsSaved is called', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', {route: mockRoute, shops: mockShops, foodCollectionData: {items: []}});

    component.currentShop.set(mockShops[0]);
    expect(component.tabStatus()).toBeUndefined();

    component.onReturnCategoryValueChange({key: 'Graue Kisten', value: 2});
    expect(component.tabStatus()).toBe('unsaved');

    component.markAsSaved();
    expect(component.tabStatus()).toBe('complete');
  });

  it('tabStatus - invalid once a free-text row duplicates a return category', () => {
    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', {route: mockRoute, shops: mockShops, foodCollectionData: {items: []}});

    component.currentShop.set(mockShops[0]);
    component.addReturnItem('graue kisten', 2);

    expect(component.tabStatus()).toBe('invalid');
  });

  it('resets to a blank state without an error for a route with no shops', () => {
    // Regression test for #3527: findNextUnfilledShop() returns undefined for an empty route,
    // which selectShop() used to dereference directly. Calls selectShop() directly (the way
    // loadEffect() would for an empty route) rather than via detectChanges(), since Angular's
    // effect scheduler reports an effect's exception to the ErrorHandler instead of letting it
    // propagate out of detectChanges(), which would make a thrown error invisible to this test.
    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', {route: mockRoute, shops: [], foodCollectionData: {items: []}});

    expect(() => component.selectShop(undefined)).not.toThrow();

    expect(component.currentShop()).toBeNull();
  });

  it('should navigate to next shop correctly', () => {
    const mockRouteData = {
      route: mockRoute,
      shops: mockShops,
      foodCollectionData: {items: []}
    };

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('foodReturnCategories', mockFoodReturnCategories);
    componentRef.setInput('selectedRouteData', mockRouteData);

    component.currentShop.set(mockShops[1]); // start at middle shop

    const selectShopSpy = vi.spyOn(component, 'selectShop');

    component.selectNextShop();

    expect(selectShopSpy).toHaveBeenCalledWith(mockShops[2]);
  });

});
