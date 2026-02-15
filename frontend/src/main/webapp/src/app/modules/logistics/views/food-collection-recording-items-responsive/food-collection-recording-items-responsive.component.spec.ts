import {TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {FoodCollectionRecordingItemsResponsiveComponent} from './food-collection-recording-items-responsive.component';
import {FoodCollectionsApiService} from '../../../../api/food-collections-api.service';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';

describe('FoodCollectionRecordingItemsResponsiveComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
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

    const toastService = TestBed.inject(ToastService);
    const toastSpy = vi.spyOn(toastService, 'showToast');

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

    expect(toastSpy).toHaveBeenCalledWith({
      type: ToastType.SUCCESS,
      title: 'Daten wurden gespeichert!'
    });
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
    const saveItemsSpy = vi.spyOn(apiService, 'saveItemsPerShop').mockReturnValue({
      subscribe: (observer: any) => {
        observer.error('Error saving data');
      }
    } as any);

    const toastService = TestBed.inject(ToastService);
    const toastSpy = vi.spyOn(toastService, 'showToast');

    component.save();

    expect(toastSpy).toHaveBeenCalledWith({
      type: ToastType.ERROR,
      title: 'Speichern fehlgeschlagen!'
    });
  });

  it('should update categoryValues and call patchItems when onValueChange is called', () => {
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
    const patchItemsSpy = vi.spyOn(apiService, 'patchItems').mockReturnValue({
      subscribe: () => {
      }
    } as any);

    const valueChange = {
      key: mockFoodCategories[0].id,
      value: 7
    };

    component.onValueChange(valueChange);

    expect(component.categoryValues()[mockFoodCategories[0].id]).toBe(7);
    expect(patchItemsSpy).toHaveBeenCalledWith(
      mockRoute.id,
      {
        categoryId: mockFoodCategories[0].id,
        shopId: mockShops[0].id,
        amount: 7
      }
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

  it('should show error toast when selectShop fails', () => {
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

    const apiService = TestBed.inject(FoodCollectionsApiService);
    const getItemsSpy = vi.spyOn(apiService, 'getItemsPerShop').mockReturnValue({
      subscribe: (observer: any) => {
        observer.error('Error loading data');
      }
    } as any);

    const toastService = TestBed.inject(ToastService);
    const toastSpy = vi.spyOn(toastService, 'showToast');

    component.selectShop(mockShops[1]);

    expect(toastSpy).toHaveBeenCalledWith({
      type: ToastType.ERROR,
      title: 'Laden fehlgeschlagen!'
    });
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
