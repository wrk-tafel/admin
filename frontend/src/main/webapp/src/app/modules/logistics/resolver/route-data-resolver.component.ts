import {inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {RouteApiService, RouteList} from '../../../api/route-api.service';

@Injectable({
  providedIn: 'root'
})
export class RouteDataResolver {
  private readonly routeApiService = inject(RouteApiService);

  public resolve(route: ActivatedRouteSnapshot): Observable<RouteList> {
    return this.routeApiService.getRoutes();
  }

}
