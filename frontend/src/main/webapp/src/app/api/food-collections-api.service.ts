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

  saveFoodCollection(data: FoodCollectionSaveRequest): Observable<void> {
    return this.http.post<void>('/food-collections', data);
  }

}

export interface FoodCollectionSaveRequest {
  routeId: number;
  carId: number;
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
  routeId: number;
  carId: number;
  driver: EmployeeData;
  coDriver: EmployeeData;
  kmStart: number;
  kmEnd: number;
  items: FoodCollectionItem[];
}
