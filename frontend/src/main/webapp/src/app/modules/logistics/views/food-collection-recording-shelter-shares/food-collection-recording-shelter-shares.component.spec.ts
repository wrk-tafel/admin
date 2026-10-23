import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {FoodCollectionsApiService, ShelterSharesData} from '../../../../api/food-collections-api.service';
import {FoodCollectionRecordingShelterSharesComponent} from './food-collection-recording-shelter-shares.component';
import {SelectedRouteData} from '../food-collection-recording/food-collection-recording.component';

describe('FoodCollectionRecordingShelterSharesComponent', () => {
  let apiService: MockedObject<FoodCollectionsApiService>;

  const shares: ShelterSharesData = {
    householdPersons: 90,
    shelterPersons: 10,
    totalBoxes: 3,
    routes: [{
      routeId: 7,
      routeName: 'Route 7',
      shelters: [
        {
          shelterId: 1, shelterName: 'Notschlafstelle A', personsCount: 10,
          items: [{foodCategoryId: 2, foodCategory: 'Obst / Gemüse', boxes: 3}]
        },
        {shelterId: 2, shelterName: 'Notschlafstelle B', personsCount: 5, items: []}
      ]
    }]
  };

  const routeData = (shelterIds: number[]): SelectedRouteData => ({
    route: {id: 7, number: 7, name: 'Route 7', enabled: true, stops: []},
    shops: [],
    foodCollectionData: {
      routeId: 7, carId: 1,
      driver: {id: 1, personnelNumber: '1', firstname: 'A', lastname: 'B'},
      coDriver: {id: 2, personnelNumber: '2', firstname: 'C', lastname: 'D'},
      kmStart: 1, kmEnd: 2, items: [], returnItems: [], shelterIds
    }
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{provide: FoodCollectionsApiService, useValue: {getShelterShares: vi.fn(() => of(shares))}}]
    });
    apiService = TestBed.inject(FoodCollectionsApiService) as MockedObject<FoodCollectionsApiService>;
  });

  function render(data: SelectedRouteData, refreshKey = 0) {
    const fixture = TestBed.createComponent(FoodCollectionRecordingShelterSharesComponent);
    fixture.componentRef.setInput('selectedRouteData', data);
    fixture.componentRef.setInput('refreshKey', refreshKey);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the estimate for each shelter of the route', () => {
    const element: HTMLElement = render(routeData([1, 2])).nativeElement;

    const first = element.querySelector('[testid="food-collection-shelter-share-0"]')!.textContent;
    expect(first).toContain('Notschlafstelle A');
    expect(first).toContain('ca. 3 Kisten Obst / Gemüse');
    expect(element.querySelector('[testid="food-collection-shelter-share-1"]')!.textContent).toContain('nichts aus dieser Route');
    expect(element.textContent).toContain('90 angemeldeten Personen');
  });

  it('asks nothing for a route without shelters', () => {
    const element: HTMLElement = render(routeData([])).nativeElement;

    expect(apiService.getShelterShares).not.toHaveBeenCalled();
    expect(element.querySelector('[testid="food-collection-shelter-shares"]')).toBeNull();
  });

  it('asks again once the route was saved', () => {
    const fixture = render(routeData([1]));
    fixture.componentRef.setInput('refreshKey', 1);
    fixture.detectChanges();

    expect(apiService.getShelterShares).toHaveBeenCalledTimes(2);
  });
});
