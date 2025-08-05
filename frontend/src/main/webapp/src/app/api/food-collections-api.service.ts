import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {EmployeeData} from './employee-api.service';

@Injectable({
  providedIn: 'root'
})
export class FoodCollectionsApiService {
  private readonly http = inject(HttpClient);

  getFoodCollection(routeId: number): Observable<FoodCollectionData> {
    return this.http.get<FoodCollectionData>(`/food-collections/route/${routeId}`);
  }

  saveRouteData(routeId: number, data: FoodCollectionSaveRouteDataRequest): Observable<void> {
    return this.http.post<void>(`/food-collections/route/${routeId}`, data);
  }

  saveItems(routeId: number, data: FoodCollectionSaveItemsRequest): Observable<void> {
    return this.http.post<void>(`/food-collections/route/${routeId}/items`, data);
  }

  saveItemsPerShop(routeId: number, shopId: number, data: FoodCollectionSaveItemsPerShopRequest): Observable<void> {
    return this.http.post<void>(`/food-collections/route/${routeId}/shop/${shopId}/items`, data);
  }

  getItemsPerShop(routeId: number, shopId: number): Observable<void> {
    return this.http.get<void>(`/food-collections/route/${routeId}/shop/${shopId}/items`);
  }

  patchItems(routeId: number, data: FoodCollectionItem): Observable<void> {
    return this.http.patch<void>(`/food-collections/route/${routeId}/items`, data);
  }

}

export interface FoodCollectionSaveRouteDataRequest {
  carId: number;
  driverId: number;
  coDriverId: number;
  kmStart: number;
  kmEnd: number;
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
}
