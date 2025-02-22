import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ShelterApiService {
  private readonly http = inject(HttpClient);

  getShelters(): Observable<ShelterListResponse> {
    return this.http.get<ShelterListResponse>('/shelters');
  }

}

export interface ShelterListResponse {
  shelters: ShelterItem[];
}

export interface ShelterItem {
  id: number;
  name: string;
  addressStreet: string;
  addressHouseNumber: string;
  addressStairway?: string;
  addressDoor?: string;
  addressPostalCode: number;
  addressCity: string;
  note: string;
  personsCount: number;
}
