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

describe('FoodCollectionRecordingItemsResponsiveComponent', () => {
  let offlineQueueService: {enqueue: ReturnType<typeof vi.fn>; getPendingForShop: ReturnType<typeof vi.fn>};
  let onlineSignal: ReturnType<typeof signal<boolean>>;

  beforeEach(() => {
    offlineQueueService = {enqueue: vi.fn(), getPendingForShop: vi.fn().mockReturnValue([])};
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
    componentRef.setInput('selectedRouteData', mockRouteData);

    const selectShopSpy = vi.spyOn(component, 'selectShop');

    fixture.detectChanges();

    expect(selectShopSpy).toHaveBeenCalledWith(mockShops[1]);
  });

  it('should call api service to save items when save is called', () => {
    const mockRouteData = {
      route: mockRoute,
      shops: mockShops,
      foodCollectionData: {items: []}
    };

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('selectedRouteData', mockRouteData);

    component.currentShop.set(mockShops[0]);
    component.categoryValues.set({1: 3, 2: 5});

    const apiService = TestBed.inject(FoodCollectionsApiService);
    const saveItemsSpy = vi.spyOn(apiService, 'saveItemsPerShop').mockReturnValue({
      subscribe: (observer: any) => {
        observer.next();
      }
    } as any);

    const toastr = TestBed.inject(TafelToastrService);
    const toastSpy = vi.spyOn(toastr, 'success');

    component.save();

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

    expect(toastSpy).toHaveBeenCalledWith('Daten wurden gespeichert!');
  });

  it('should show error toast when save fails', () => {
    const mockRouteData = {
      route: mockRoute,
      shops: mockShops,
      foodCollectionData: {items: []}
    };

    const fixture = TestBed.createComponent(FoodCollectionRecordingItemsResponsiveComponent);
    const component = fixture.componentInstance;
    const componentRef = fixture.componentRef;

    componentRef.setInput('foodCategories', mockFoodCategories);
    componentRef.setInput('selectedRouteData', mockRouteData);

    component.currentShop.set(mockShops[0]);

    const apiService = TestBed.inject(FoodCollectionsApiService);
    vi.spyOn(apiService, 'saveItemsPerShop').mockReturnValue({
      subscribe: (observer: any) => {
        observer.error('Error saving data');
      }
    } as any);

    const toastr = TestBed.inject(TafelToastrService);
    const toastSpy = vi.spyOn(toastr, 'error');

    component.save();

    expect(toastSpy).toHaveBeenCalledWith('Speichern fehlgeschlagen!');
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
    componentRef.setInput('selectedRouteData', mockRouteData);

    component.currentShop.set(mockShops[1]); // start at middle shop

    const selectShopSpy = vi.spyOn(component, 'selectShop');

    component.selectPreviousShop();

    expect(selectShopSpy).toHaveBeenCalledWith(mockShops[0]);
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
    componentRef.setInput('selectedRouteData', mockRouteData);

    component.currentShop.set(mockShops[1]); // start at middle shop

    const selectShopSpy = vi.spyOn(component, 'selectShop');

    component.selectNextShop();

    expect(selectShopSpy).toHaveBeenCalledWith(mockShops[2]);
  });

});
