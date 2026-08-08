import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {
  FoodCollectionData,
  FoodCollectionItem,
  FoodCollectionsApiService,
  FoodCollectionSaveItemsPerShopRequest,
  FoodCollectionSaveItemsRequest,
  FoodCollectionSaveKmRequest,
  FoodCollectionSaveReturnItemsPerShopRequest,
  FoodCollectionSaveReturnItemsRequest,
  FoodCollectionSaveRouteDataRequest
} from './food-collections-api.service';

describe('FoodCollectionsApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: FoodCollectionsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        FoodCollectionsApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(FoodCollectionsApiService);
  });

  it('get food collection', () => {
    const routeId = 123;
    const mockFoodCollectionData: FoodCollectionData = {
      routeId: 1,
      carId: 2,
      driver: {id: 3, personnelNumber: '333', firstname: 'Max', lastname: 'Mustermann'},
      coDriver: {id: 4, personnelNumber: '444', firstname: 'Erika', lastname: 'Musterfrau'},
      kmStart: 1000,
      kmEnd: 2000,
      items: [
        {categoryId: 0, shopId: 0, amount: 0},
        {categoryId: 1, shopId: 0, amount: 1},
        {categoryId: 0, shopId: 1, amount: 2},
        {categoryId: 1, shopId: 1, amount: 3},
      ],
      returnItems: [
        {shopId: 0, description: 'Graue Kisten', amount: 4},
      ]
    };

    apiService.getFoodCollection(routeId).subscribe((data: FoodCollectionData) => {
      expect(data).toEqual(mockFoodCollectionData);
    });

    const req = httpMock.expectOne({method: 'GET', url: `/food-collections/routes/${routeId}`});
    req.flush(mockFoodCollectionData);
    httpMock.verify();
  });

  it('save route data', () => {
    const routeId = 1;
    const mockRouteData: FoodCollectionSaveRouteDataRequest = {
      carId: 1,
      driverId: 2,
      coDriverId: 3
    };

    apiService.saveRouteData(routeId, mockRouteData).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: `/food-collections/routes/${routeId}`});
    req.flush({});
    httpMock.verify();

    expect(req.request.body).toEqual(mockRouteData);
  });

  it('save km', () => {
    const routeId = 1;
    const mockKmData: FoodCollectionSaveKmRequest = {
      kmStart: 1000,
      kmEnd: 2000
    };

    apiService.saveKm(routeId, mockKmData).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: `/food-collections/routes/${routeId}/km`});
    req.flush({});
    httpMock.verify();

    expect(req.request.body).toEqual(mockKmData);
  });

  it('save return items', () => {
    const routeId = 1;
    const mockReturnItems: FoodCollectionSaveReturnItemsRequest = {
      returnItems: [
        {shopId: 0, description: 'Graue Kisten', amount: 4},
        {shopId: 1, description: 'Bananenkartons', amount: 2},
      ]
    };

    apiService.saveReturnItems(routeId, mockReturnItems).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: `/food-collections/routes/${routeId}/return-items`});
    req.flush({});
    httpMock.verify();

    expect(req.request.body).toEqual(mockReturnItems);
  });

  it('save return items per shop', () => {
    const routeId = 1;
    const shopId = 2;
    const mockReturnItems: FoodCollectionSaveReturnItemsPerShopRequest = {
      returnItems: [
        {description: 'Graue Kisten', amount: 4},
      ]
    };

    apiService.saveReturnItemsPerShop(routeId, shopId, mockReturnItems).subscribe();

    const req = httpMock.expectOne({
      method: 'POST',
      url: `/food-collections/routes/${routeId}/shops/${shopId}/return-items`
    });
    req.flush({});
    httpMock.verify();

    expect(req.request.body).toEqual(mockReturnItems);
  });

  it('save items', () => {
    const routeId = 1;
    const mockFoodCollection: FoodCollectionSaveItemsRequest = {
      items: [
        {categoryId: 0, shopId: 0, amount: 0},
        {categoryId: 1, shopId: 0, amount: 1},
        {categoryId: 0, shopId: 1, amount: 2},
        {categoryId: 1, shopId: 1, amount: 3},
      ]
    };

    apiService.saveItems(routeId, mockFoodCollection).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: `/food-collections/routes/${routeId}/items`});
    req.flush({});
    httpMock.verify();

    expect(req.request.body).toEqual(mockFoodCollection);
  });

  it('save items per shop', () => {
    const routeId = 1;
    const shopId = 2;
    const mockFoodCollection: FoodCollectionSaveItemsPerShopRequest = {
      items: [
        {categoryId: 0, amount: 0},
        {categoryId: 1, amount: 1},
      ]
    };

    apiService.saveItemsPerShop(routeId, shopId, mockFoodCollection).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: `/food-collections/routes/${routeId}/shops/${shopId}/items`});
    req.flush({});
    httpMock.verify();

    expect(req.request.body).toEqual(mockFoodCollection);
  });

  it('get items per shop', () => {
    const routeId = 1;
    const shopId = 2;

    apiService.getItemsPerShop(routeId, shopId).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: `/food-collections/routes/${routeId}/shops/${shopId}/items`});
    req.flush({});
    httpMock.verify();
  });

  it('patch items', () => {
    const routeId = 1;
    const data: FoodCollectionItem = {categoryId: 0, shopId: 1, amount: 2};

    apiService.patchItems(routeId, data).subscribe();

    const req = httpMock.expectOne({method: 'PATCH', url: `/food-collections/routes/${routeId}/items`});
    req.flush({});
    httpMock.verify();

    expect(req.request.body).toEqual(data);
  });

});
