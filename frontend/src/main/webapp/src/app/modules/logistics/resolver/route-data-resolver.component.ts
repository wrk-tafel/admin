import {inject, Service} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {RouteApiService, RouteList} from '../../../api/route-api.service';

@Service()
export class RouteDataResolver {
  private readonly routeApiService = inject(RouteApiService);

  public resolve(_route: ActivatedRouteSnapshot): Observable<RouteList> {
    return this.routeApiService.getRoutes();
  }

}
