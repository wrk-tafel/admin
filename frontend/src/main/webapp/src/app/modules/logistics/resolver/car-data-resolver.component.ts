import {inject, Service} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {CarApiService, CarList} from '../../../api/car-api.service';

@Service()
export class CarDataResolver {
  private readonly carApiService = inject(CarApiService);

  public resolve(_route: ActivatedRouteSnapshot): Observable<CarList> {
    return this.carApiService.getActiveCars();
  }

}
