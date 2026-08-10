import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {of} from 'rxjs';
import {FoodCollectionRecordingKmComponent} from './food-collection-recording-km.component';
import {FoodCollectionsApiService} from '../../../../api/food-collections-api.service';
import {RouteData} from '../../../../api/route-api.service';
import {SelectedRouteData} from '../food-collection-recording/food-collection-recording.component';

describe('FoodCollectionRecordingKmComponent', () => {
  let foodCollectionsApiServiceSpy: MockedObject<FoodCollectionsApiService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        FoodCollectionRecordingKmComponent
      ],
      providers: [
        {
          provide: FoodCollectionsApiService,
          useValue: {
            saveKm: vi.fn().mockName('FoodCollectionsApiService.saveKm')
          }
        }
      ]
    }).compileComponents();

    foodCollectionsApiServiceSpy = TestBed.inject(FoodCollectionsApiService) as MockedObject<FoodCollectionsApiService>;
  });

  const mockRoute: RouteData = {id: 123, number: 1, name: 'Test Route', enabled: true, stops: []};
  const mockRouteData: SelectedRouteData = {
    route: mockRoute,
    shops: [],
    foodCollectionData: {
      carId: 1,
      routeId: mockRoute.id,
      driver: {id: 1, personnelNumber: 'D1', firstname: 'Driver', lastname: 'One'},
      coDriver: {id: 2, personnelNumber: 'D2', firstname: 'Driver', lastname: 'Two'},
      kmStart: 100,
      kmEnd: 200,
      items: [],
      returnItems: []
    }
  };

  function createComponent(routeData: SelectedRouteData = mockRouteData) {
    const fixture = TestBed.createComponent(FoodCollectionRecordingKmComponent);
    fixture.componentRef.setInput('selectedRouteData', routeData);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('component can be created', () => {
    expect(createComponent()).toBeTruthy();
  });

  it('should prefill the km values from the food collection data', () => {
    const component = createComponent();

    expect(component.kmStart.value).toEqual(100);
    expect(component.kmEnd.value).toEqual(200);
  });

  it('should validate that km end is greater than km start', () => {
    const component = createComponent({...mockRouteData, foodCollectionData: undefined});

    component.kmStart.setValue(100);
    component.kmEnd.setValue(150);
    expect(component.kmEnd.errors).toBeFalsy();

    component.kmStart.setValue(200);
    component.kmEnd.setValue(150);
    expect(component.kmEnd.errors!['kmValidation']).toBe(true);

    component.kmStart.setValue(150);
    component.kmEnd.setValue(150);
    expect(component.kmEnd.errors!['kmValidation']).toBe(true);
  });

  it('should accept an empty km form as valid but provide no save request', () => {
    const component = createComponent({...mockRouteData, foodCollectionData: undefined});

    expect(component.hasInvalidInput()).toBe(false);
    expect(component.saveRequest()).toBeNull();
    expect(foodCollectionsApiServiceSpy.saveKm).not.toHaveBeenCalled();
  });

  it('should reject only one of the two km values being filled', () => {
    const component = createComponent({...mockRouteData, foodCollectionData: undefined});

    component.kmStart.setValue(100);
    expect(component.hasInvalidInput()).toBe(true);
    expect(component.kmEnd.errors!['kmIncomplete']).toBe(true);

    component.kmStart.setValue(null);
    component.kmEnd.setValue(200);
    expect(component.hasInvalidInput()).toBe(true);
    expect(component.kmStart.errors!['kmIncomplete']).toBe(true);
  });

  it('should provide a save request with both km values', () => {
    foodCollectionsApiServiceSpy.saveKm.mockReturnValue(of(undefined));
    const component = createComponent();

    component.kmStart.setValue(100);
    component.kmEnd.setValue(250);

    expect(component.saveRequest()).not.toBeNull();
    expect(foodCollectionsApiServiceSpy.saveKm).toHaveBeenCalledWith(123, {kmStart: 100, kmEnd: 250});
  });

  it('should only ask for confirmation above the km difference threshold', () => {
    const component = createComponent();

    component.kmStart.setValue(100);
    component.kmEnd.setValue(450);
    expect(component.kmDifference()).toEqual(350);
    expect(component.needsKmDifferenceConfirmation()).toBe(false);

    component.kmEnd.setValue(451);
    expect(component.kmDifference()).toEqual(351);
    expect(component.needsKmDifferenceConfirmation()).toBe(true);
  });

  it('should not ask for confirmation when the km values are incomplete', () => {
    const component = createComponent({...mockRouteData, foodCollectionData: undefined});

    expect(component.kmDifference()).toBeNull();
    expect(component.needsKmDifferenceConfirmation()).toBe(false);
  });

});
