import {inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {CarApiService, CarList} from '../../../api/car-api.service';

@Injectable({
  providedIn: 'root'
})
export class CarDataResolver {
  private readonly carApiService = inject(CarApiService);

  public resolve(route: ActivatedRouteSnapshot): Observable<CarList> {
    return this.carApiService.getCars();
  }

}
