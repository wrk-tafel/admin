import {inject, Injectable} from '@angular/core';
import {ShelterApiService, ShelterListResponse} from '../../../api/shelter-api.service';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardSheltersDataResolver {
  private readonly shelterApiService = inject(ShelterApiService);

  public resolve(): Observable<ShelterListResponse> {
    return this.shelterApiService.getShelters();
  }

}
