import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {FoodCollectionsApiService} from '../../../../api/food-collections-api.service';
import {FoodCollectionRecordingSheltersComponent} from './food-collection-recording-shelters.component';
import {SelectedRouteData} from '../food-collection-recording/food-collection-recording.component';

describe('FoodCollectionRecordingSheltersComponent', () => {
  let apiService: MockedObject<FoodCollectionsApiService>;

  const routeData = (shelterIds?: number[]): SelectedRouteData => ({
    route: {id: 7, number: 7, name: 'Route 7', enabled: true, stops: []},
    shops: [],
    foodCollectionData: shelterIds ? {
      routeId: 7,
      carId: 1,
      driver: {id: 1, personnelNumber: '1', firstname: 'A', lastname: 'B'},
      coDriver: {id: 2, personnelNumber: '2', firstname: 'C', lastname: 'D'},
      kmStart: 1,
      kmEnd: 2,
      items: [],
      returnItems: [],
      shelterIds
    } : undefined
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {provide: FoodCollectionsApiService, useValue: {saveShelters: vi.fn().mockReturnValue(of(undefined))}}
      ]
    });
    apiService = TestBed.inject(FoodCollectionsApiService) as MockedObject<FoodCollectionsApiService>;
  });

  function create(data: SelectedRouteData) {
    const fixture = TestBed.createComponent(FoodCollectionRecordingSheltersComponent);
    fixture.componentRef.setInput('selectedRouteData', data);
    fixture.componentRef.setInput('shelterList', []);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('starts from the shelters the server holds for the route', () => {
    const component = create(routeData([1, 2]));

    expect(component.shelterIds.value).toEqual([1, 2]);
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('sends nothing while the selection is unchanged', () => {
    const component = create(routeData([1, 2]));

    expect(component.saveRequest()).toBeNull();
  });

  it('sends a changed selection and counts it as saved afterwards', () => {
    const component = create(routeData([1]));
    component.shelterIds.setValue([1, 3]);

    expect(component.hasUnsavedChanges()).toBe(true);
    component.saveRequest()!.subscribe();
    expect(apiService.saveShelters).toHaveBeenCalledWith(7, {shelterIds: [1, 3]});

    component.markAsSaved();
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('treats a route without a food collection yet as having no shelters', () => {
    const component = create(routeData());

    expect(component.shelterIds.value).toEqual([]);
    expect(component.saveRequest()).toBeNull();
  });
});
