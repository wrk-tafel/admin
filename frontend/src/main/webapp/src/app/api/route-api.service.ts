import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RouteApiService {
  private readonly http = inject(HttpClient);

  getRoutes(): Observable<RouteList> {
    return this.http.get<RouteList>('/routes');
  }

  getShopsOfRoute(routeId: number): Observable<ShopsOfRouteData> {
    return this.http.get<ShopsOfRouteData>(`/routes/${routeId}/shops`);
  }

}

export interface RouteList {
  routes: RouteData[];
}

export interface RouteData {
  id: number;
  name: string;
}

export interface ShopsOfRouteData {
  shops: Shop[];
}

export interface Shop {
  id: number;
  number: number;
  name: string;
  address: string;
}
