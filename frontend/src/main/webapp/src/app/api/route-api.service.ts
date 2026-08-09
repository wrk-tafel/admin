import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {FoodUnit} from './shop-api.service';

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

  getRouteGuidance(routeId: number): Observable<RouteGuidanceData> {
    return this.http.get<RouteGuidanceData>(`/routes/${routeId}/guidance`);
  }

  setStopCompletion(routeId: number, stopId: number, completed: boolean): Observable<RouteGuidanceStop> {
    return this.http.put<RouteGuidanceStop>(`/routes/${routeId}/guidance/stops/${stopId}`, {completed});
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

export interface RouteGuidanceData {
  routeId: number;
  routeNumber: number;
  routeName: string;
  routeNote?: string;
  date: string;
  returnItemsFrom?: string;
  stops: RouteGuidanceStop[];
  unassignedReturnItems: RouteGuidanceReturnItem[];
}

export interface RouteGuidanceReturnItem {
  shopName: string;
  description: string;
  amount: number;
}

export interface RouteGuidanceStop {
  stopId: number;
  time: string;
  description?: string;
  shop?: RouteGuidanceShop;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  returnItems: RouteGuidanceReturnItem[];
}

export interface RouteGuidanceShop {
  id: number;
  number: number;
  name: string;
  address: string;
  phone?: string;
  contactPerson?: string;
  note?: string;
  foodUnit: FoodUnit;
  enabled: boolean;
}
