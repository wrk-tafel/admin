import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { FoodCollectionRecordingItemsDesktopComponent } from './food-collection-recording-items-desktop.component';
import { GlobalStateService } from '../../../../common/state/global-state.service';
import { DistributionItem } from '../../../../api/distribution-api.service';
import { RouteData, Shop } from '../../../../api/route-api.service';
import { FoodCategory } from '../../../../api/food-categories-api.service';
import { FoodReturnCategory } from '../../../../api/food-return-categories-api.service';
import { FoodCollectionData, FoodCollectionsApiService } from '../../../../api/food-collections-api.service';
import { EmployeeData } from '../../../../api/employee-api.service';
import { signal } from '@angular/core';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('FoodCollectionRecordingItemsDesktopComponent', () => {
    let globalStateService: MockedObject<GlobalStateService>;
    let foodCollectionsApiService: MockedObject<FoodCollectionsApiService>;

    beforeEach((() => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule
            ],
            providers: [
                {
                    provide: GlobalStateService,
                    useValue: {
                        getCurrentDistribution: vi.fn().mockName('GlobalStateService.getCurrentDistribution')
                    }
                },
                {
                    provide: FoodCollectionsApiService,
                    useValue: {
                        saveItems: vi.fn().mockName('FoodCollectionsApiService.saveItems'),
                        saveReturnItems: vi.fn().mockName('FoodCollectionsApiService.saveReturnItems')
                    }
                },
                {
                    provide: TafelToastrService,
                    useValue: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn(), show: vi.fn() }
                }
            ]
        }).compileComponents();

        globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;
        foodCollectionsApiService = TestBed.inject(FoodCollectionsApiService) as MockedObject<FoodCollectionsApiService>;
    }));

    const testDistribution: DistributionItem = {
        id: 123,
        startedAt: new Date()
    };
    const testRoute: RouteData = {
        id: 0,
        number: 1,
        name: 'Route 1',
        enabled: true,
        stops: []
    };
    const testFoodCategories: FoodCategory[] = [
        { id: 0, name: 'Category 1', weightPerUnit: 1, sortOrder: 0, enabled: true },
        { id: 1, name: 'Category 2', weightPerUnit: 2, sortOrder: 1, enabled: true },
    ];
    const testFoodReturnCategories: FoodReturnCategory[] = [
        { id: 2, name: 'Graue Kisten', sortOrder: 1, enabled: true },
    ];
    const testShops: Shop[] = [
        { id: 0, number: 1, name: 'Shop 1', address: 'Address 1' },
        { id: 1, number: 2, name: 'Shop 2', address: 'Address 2' },
    ];
    const testDriver: EmployeeData = { id: 1, personnelNumber: 'D1', firstname: 'Driver', lastname: 'One' };
    const testCoDriver: EmployeeData = { id: 2, personnelNumber: 'D2', firstname: 'Driver', lastname: 'Two' };

    it('component can be created', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingItemsDesktopComponent);
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

    it('ngOnInit - selected route provides category controls split by return item', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingItemsDesktopComponent);
        const component = fixture.componentInstance;
        const componentRef = fixture.componentRef;
        globalStateService.getCurrentDistribution.mockReturnValue(signal<DistributionItem>(testDistribution).asReadonly());

        expect(component.categories.controls).toEqual([]);

        const selectedRouteData = {
            route: testRoute,
            shops: testShops
        };
        componentRef.setInput('selectedRouteData', selectedRouteData);
        componentRef.setInput('foodCategories', testFoodCategories);
        componentRef.setInput('foodReturnCategories', testFoodReturnCategories);
        fixture.detectChanges();

        expect(component.categories.controls.length).toEqual(2);
        expect(component.returnCategories.controls.length).toEqual(1);
        expect(component.getShops(0).controls.length).toEqual(testShops.length);
        expect(component.getShops(1).controls.length).toEqual(testShops.length);
        expect(component.getReturnCategoryShops(0).controls.length).toEqual(testShops.length);
    });

    it('ngOnInit - prefills amounts from existing foodCollectionData items and return items', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingItemsDesktopComponent);
        const component = fixture.componentInstance;
        const componentRef = fixture.componentRef;

        const testFoodCollectionData: FoodCollectionData = {
            routeId: testRoute.id,
            carId: 1,
            driver: testDriver,
            coDriver: testCoDriver,
            kmStart: 0,
            kmEnd: 10,
            items: [
                { categoryId: testFoodCategories[0].id, shopId: testShops[0].id, amount: 7 }
            ],
            returnItems: [
                { shopId: testShops[1].id, description: 'Graue Kisten', amount: 4 },
                { shopId: testShops[0].id, description: 'Bananenkartons', amount: 2 }
            ]
        };

        componentRef.setInput('selectedRouteData', {
            route: testRoute,
            shops: testShops,
            foodCollectionData: testFoodCollectionData
        });
        componentRef.setInput('foodCategories', testFoodCategories);
        componentRef.setInput('foodReturnCategories', testFoodReturnCategories);
        fixture.detectChanges();

        expect(component.getShops(0).at(0).get('amount')!.value).toEqual(7);
        // any category/shop combination without matching item data should default to 0
        expect(component.getShops(0).at(1).get('amount')!.value).toEqual(0);
        expect(component.getShops(1).at(0).get('amount')!.value).toEqual(0);

        // the known return category is prefilled from the matching description
        expect(component.getReturnCategoryShops(0).at(0).get('amount')!.value).toEqual(0);
        expect(component.getReturnCategoryShops(0).at(1).get('amount')!.value).toEqual(4);

        // everything else becomes a free-text row
        expect(component.returnItems.controls.length).toEqual(1);
        expect(component.returnItems.at(0).get('description')!.value).toEqual('Bananenkartons');
        expect(component.returnItems.at(0).get('shopId')!.value).toEqual(testShops[0].id);
        expect(component.returnItems.at(0).get('amount')!.value).toEqual(2);
    });

    it('saveRequests - maps category and shop amounts into a saveItems request', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingItemsDesktopComponent);
        const component = fixture.componentInstance;
        const componentRef = fixture.componentRef;
        foodCollectionsApiService.saveItems.mockReturnValue(of(undefined));
        foodCollectionsApiService.saveReturnItems.mockReturnValue(of(undefined));

        componentRef.setInput('selectedRouteData', {
            route: testRoute,
            shops: testShops
        });
        componentRef.setInput('foodCategories', testFoodCategories);
        componentRef.setInput('foodReturnCategories', testFoodReturnCategories);
        fixture.detectChanges();

        component.getShops(0).at(0).get('amount')!.setValue(3);
        component.getShops(0).at(1).get('amount')!.setValue(4);
        component.getShops(1).at(0).get('amount')!.setValue(5);
        component.getShops(1).at(1).get('amount')!.setValue(6);

        expect(component.saveRequests()).toHaveLength(2);

        expect(foodCollectionsApiService.saveItems).toHaveBeenCalledWith(testRoute.id, {
            items: [
                { categoryId: testFoodCategories[0].id, shopId: testShops[0].id, amount: 3 },
                { categoryId: testFoodCategories[0].id, shopId: testShops[1].id, amount: 4 },
                { categoryId: testFoodCategories[1].id, shopId: testShops[0].id, amount: 5 },
                { categoryId: testFoodCategories[1].id, shopId: testShops[1].id, amount: 6 },
            ]
        });
    });

    it('saveRequests - sends return category counters and free-text rows as return items', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingItemsDesktopComponent);
        const component = fixture.componentInstance;
        const componentRef = fixture.componentRef;
        foodCollectionsApiService.saveItems.mockReturnValue(of(undefined));
        foodCollectionsApiService.saveReturnItems.mockReturnValue(of(undefined));

        componentRef.setInput('selectedRouteData', {
            route: testRoute,
            shops: testShops
        });
        componentRef.setInput('foodCategories', testFoodCategories);
        componentRef.setInput('foodReturnCategories', testFoodReturnCategories);
        fixture.detectChanges();

        component.getReturnCategoryShops(0).at(1).get('amount')!.setValue(4);
        component.addReturnItem(testShops[0].id, 'Bananenkartons', 2);

        component.saveRequests();

        // zero-amount counters are left out entirely
        expect(foodCollectionsApiService.saveReturnItems).toHaveBeenCalledWith(testRoute.id, {
            returnItems: [
                { shopId: testShops[1].id, description: 'Graue Kisten', amount: 4 },
                { shopId: testShops[0].id, description: 'Bananenkartons', amount: 2 },
            ]
        });
    });

    it('saveRequests - skips the return items when a free-text row duplicates a return category', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingItemsDesktopComponent);
        const component = fixture.componentInstance;
        const componentRef = fixture.componentRef;
        foodCollectionsApiService.saveItems.mockReturnValue(of(undefined));

        componentRef.setInput('selectedRouteData', {
            route: testRoute,
            shops: testShops
        });
        componentRef.setInput('foodCategories', testFoodCategories);
        componentRef.setInput('foodReturnCategories', testFoodReturnCategories);
        fixture.detectChanges();

        component.addReturnItem(testShops[0].id, 'graue kisten', 2);

        expect(component.hasInvalidInput()).toBe(true);
        expect(component.returnItems.at(0).get('description')!.errors!['duplicate']).toBe(true);
        expect(component.saveRequests()).toHaveLength(1);
        expect(foodCollectionsApiService.saveReturnItems).not.toHaveBeenCalled();
    });

    it('saveRequests - flags two free-text rows with the same description for the same shop', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingItemsDesktopComponent);
        const component = fixture.componentInstance;
        const componentRef = fixture.componentRef;

        componentRef.setInput('selectedRouteData', {
            route: testRoute,
            shops: testShops
        });
        componentRef.setInput('foodCategories', testFoodCategories);
        componentRef.setInput('foodReturnCategories', testFoodReturnCategories);
        fixture.detectChanges();

        component.addReturnItem(testShops[0].id, 'Bananenkartons', 2);
        component.addReturnItem(testShops[1].id, 'Bananenkartons', 3);
        expect(component.hasInvalidInput()).toBe(false);

        component.addReturnItem(testShops[0].id, 'Bananenkartons', 1);
        expect(component.hasInvalidInput()).toBe(true);

        component.removeReturnItem(2);
        expect(component.hasInvalidInput()).toBe(false);
    });

    it('saveRequests - returns nothing when no route is selected', () => {
        const fixture = TestBed.createComponent(FoodCollectionRecordingItemsDesktopComponent);
        const component = fixture.componentInstance;

        expect(component.saveRequests()).toEqual([]);

        expect(foodCollectionsApiService.saveItems).not.toHaveBeenCalled();
    });

});
