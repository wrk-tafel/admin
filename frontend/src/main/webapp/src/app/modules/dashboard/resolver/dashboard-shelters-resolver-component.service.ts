import {inject, Service} from '@angular/core';
import {ShelterApiService, ShelterListResponse} from '../../../api/shelter-api.service';
import {Observable} from 'rxjs';

@Service()
export class DashboardSheltersDataResolver {
  private readonly shelterApiService = inject(ShelterApiService);

  public resolve(): Observable<ShelterListResponse> {
    return this.shelterApiService.getActiveShelters();
  }

}
