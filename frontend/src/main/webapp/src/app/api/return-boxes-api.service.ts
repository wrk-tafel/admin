import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

@Service()
export class ReturnBoxesApiService {
  private readonly http = inject(HttpClient);

  getReturnBoxes(): Observable<ReturnBoxesList> {
    return this.http.get<ReturnBoxesList>('/return-boxes');
  }

  setReturned(routeId: number, shopId: number, returned: boolean): Observable<ReturnBoxesList> {
    return this.http.put<ReturnBoxesList>(`/return-boxes/routes/${routeId}/shops/${shopId}`, {returned});
  }
}

export interface ReturnBoxesList {
  routes: ReturnBoxesRoute[];
}

export interface ReturnBoxesRoute {
  routeId: number;
  routeNumber: number;
  routeName: string;
  shops: ReturnBoxesShop[];
}

export interface ReturnBoxesShop {
  shopId: number;
  shopName: string;
  address: string;
  boxes: ReturnBoxesEntry[];
}

export interface ReturnBoxesEntry {
  description: string;
  amount: number;
  since: string;
  returned: boolean;
}
