import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {provideHttpClient} from '@angular/common/http';
import {FoodCollectionData, FoodCollectionsApiService} from "./food-collections-api.service";

describe('FoodCollectionsApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: FoodCollectionsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FoodCollectionsApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(FoodCollectionsApiService);
  });

  it('save collection', () => {
    const mockFoodCollection: FoodCollectionData = {
      routeId: 1,
      carLicensePlate: "W-X123-AB",
      driverId: 2,
      coDriverId: 3,
      kmStart: 1000,
      kmEnd: 2000,
      items: [
        {categoryId: 0, shopId: 0, amount: 0},
        {categoryId: 1, shopId: 0, amount: 1},
        {categoryId: 0, shopId: 1, amount: 2},
        {categoryId: 1, shopId: 1, amount: 3},
      ]
    };

    apiService.saveFoodCollection(mockFoodCollection).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/food-collections'});
    req.flush({});
    httpMock.verify();

    expect(req.request.body).toEqual(mockFoodCollection);
  });

});