import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FoodCollectionsApiService {
  private readonly http = inject(HttpClient);

  getFoodCollection(routeId: number): Observable<FoodCollectionData> {
    return this.http.get<FoodCollectionData>(`/food-collections/route/${routeId}`);
  }

  saveFoodCollection(data: FoodCollectionSaveRequest): Observable<void> {
    return this.http.post<void>('/food-collections', data);
  }

}

export interface FoodCollectionSaveRequest {
  routeId: number;
  carLicensePlate: string;
  driverId: number;
  coDriverId: number;
  kmStart: number;
  kmEnd: number;
  items: FoodCollectionItem[]
}

export interface FoodCollectionItem {
  categoryId: number;
  shopId: number;
  amount: number;
}

export interface FoodCollectionData {
  items: FoodCollectionItem[];
}
