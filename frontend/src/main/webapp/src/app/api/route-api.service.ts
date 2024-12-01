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
}

export interface RouteList {
  routes: RouteData[];
}

export interface RouteData {
  id: number;
  name: string;
  shops: Shop[];
}

export interface Shop {
  id: number;
  number: number;
  name: string;
}
