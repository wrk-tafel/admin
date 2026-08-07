import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {EmployeeData} from './employee-api.service';

@Service()
export class FoodCollectionsApiService {
  private readonly http = inject(HttpClient);

  getFoodCollection(routeId: number): Observable<FoodCollectionData> {
    return this.http.get<FoodCollectionData>(`/food-collections/routes/${routeId}`);
  }

  saveRouteData(routeId: number, data: FoodCollectionSaveRouteDataRequest): Observable<void> {
    return this.http.post<void>(`/food-collections/routes/${routeId}`, data);
  }

  saveKm(routeId: number, data: FoodCollectionSaveKmRequest): Observable<void> {
    return this.http.post<void>(`/food-collections/routes/${routeId}/km`, data);
  }

  saveReturnItems(routeId: number, data: FoodCollectionSaveReturnItemsRequest): Observable<void> {
    return this.http.post<void>(`/food-collections/routes/${routeId}/return-items`, data);
  }

  saveReturnItemsPerShop(routeId: number, shopId: number, data: FoodCollectionSaveReturnItemsPerShopRequest): Observable<void> {
    return this.http.post<void>(`/food-collections/routes/${routeId}/shops/${shopId}/return-items`, data);
  }

  saveItems(routeId: number, data: FoodCollectionSaveItemsRequest): Observable<void> {
    return this.http.post<void>(`/food-collections/routes/${routeId}/items`, data);
  }

  saveItemsPerShop(routeId: number, shopId: number, data: FoodCollectionSaveItemsPerShopRequest): Observable<void> {
    return this.http.post<void>(`/food-collections/routes/${routeId}/shops/${shopId}/items`, data);
  }

  getItemsPerShop(routeId: number, shopId: number): Observable<FoodCollectionItemsPerShopResponse> {
    return this.http.get<FoodCollectionItemsPerShopResponse>(`/food-collections/routes/${routeId}/shops/${shopId}/items`);
  }

  patchItems(routeId: number, data: FoodCollectionItem): Observable<void> {
    return this.http.patch<void>(`/food-collections/routes/${routeId}/items`, data);
  }

}

export interface FoodCollectionSaveRouteDataRequest {
  carId: number;
  driverId: number;
  coDriverId: number;
}

export interface FoodCollectionSaveKmRequest {
  kmStart: number;
  kmEnd: number;
}

export interface FoodCollectionSaveReturnItemsRequest {
  returnItems: FoodCollectionReturnItem[];
}

export interface FoodCollectionSaveReturnItemsPerShopRequest {
  returnItems: FoodCollectionReturnItemAmount[];
}

export interface FoodCollectionReturnItem {
  shopId: number;
  description: string;
  amount: number;
}

export interface FoodCollectionReturnItemAmount {
  description: string;
  amount: number;
}

export interface FoodCollectionSaveItemsPerShopRequest {
  items?: FoodCollectionCategoryWithAmount[];
}

export interface FoodCollectionCategoryWithAmount {
  categoryId: number;
  amount: number;
}

export interface FoodCollectionSaveItemsRequest {
  items?: FoodCollectionItem[];
}

export interface FoodCollectionItemsPerShopResponse {
  items: FoodCollectionItem[];
  returnItems: FoodCollectionReturnItem[];
}

export interface FoodCollectionItem {
  categoryId: number;
  shopId: number;
  amount: number;
}

export interface FoodCollectionData {
  routeId: number;
  carId: number;
  driver: EmployeeData;
  coDriver: EmployeeData;
  kmStart: number;
  kmEnd: number;
  items: FoodCollectionItem[];
  returnItems: FoodCollectionReturnItem[];
}
