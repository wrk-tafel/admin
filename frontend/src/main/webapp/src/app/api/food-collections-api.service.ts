import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FoodCollectionsApiService {
  private readonly http = inject(HttpClient);

  saveFoodCollection(data: FoodCollectionData): Observable<void> {
    return this.http.post<void>('/food-collections', data);
  }

}

export interface FoodCollectionData {
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
