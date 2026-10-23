import {inject, Service} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';
import {Observable} from 'rxjs';
import {ShelterApiService, ShelterListResponse} from '../../../api/shelter-api.service';

@Service()
export class ShelterDataResolver {
  private readonly shelterApiService = inject(ShelterApiService);

  public resolve(_route: ActivatedRouteSnapshot): Observable<ShelterListResponse> {
    return this.shelterApiService.getActiveShelters();
  }

}
