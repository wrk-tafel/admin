import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

@Service()
export class ShopApiService {
  private readonly http = inject(HttpClient);

  getAllShops(): Observable<ShopListResponse> {
    return this.http.get<ShopListResponse>('/shops');
  }

  createShop(shop: ShopItem): Observable<ShopItem> {
    return this.http.post<ShopItem>('/shops', shop);
  }

  updateShop(shopId: number, shop: ShopItem): Observable<ShopItem> {
    return this.http.put<ShopItem>(`/shops/${shopId}`, shop);
  }

}

export interface ShopListResponse {
  shops: ShopItem[];
}

export interface ShopItem {
  id: number;
  number: number;
  name: string;
  addressStreet: string;
  addressPostalCode: number;
  addressCity: string;
  foodUnit: FoodUnit;
  phone?: string;
  contactPerson?: string;
  note?: string;
  enabled: boolean;
}

export type FoodUnit = 'BOX' | 'KG';
