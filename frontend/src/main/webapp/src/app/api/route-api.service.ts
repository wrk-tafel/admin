import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

@Service()
export class RouteApiService {
  private readonly http = inject(HttpClient);

  getActiveRoutes(): Observable<RouteList> {
    return this.http.get<RouteList>('/routes/active');
  }

  getAllRoutes(): Observable<RouteList> {
    return this.http.get<RouteList>('/routes');
  }

  createRoute(route: RouteData): Observable<RouteData> {
    return this.http.post<RouteData>('/routes', route);
  }

  updateRoute(routeId: number, route: RouteData): Observable<RouteData> {
    return this.http.put<RouteData>(`/routes/${routeId}`, route);
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
  number: number;
  name: string;
  note?: string;
  enabled: boolean;
  stops: RouteStopData[];
}

export interface RouteStopData {
  id?: number;
  time: string;
  shopId?: number;
  description?: string;
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
