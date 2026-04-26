import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ShelterApiService {
  private readonly http = inject(HttpClient);

  getActiveShelters(): Observable<ShelterListResponse> {
    return this.http.get<ShelterListResponse>('/shelters/active');
  }

  getAllShelters(): Observable<ShelterListResponse> {
    return this.http.get<ShelterListResponse>('/shelters');
  }

  updateShelter(shelterId: number, shelter: ShelterItem): Observable<ShelterItem> {
    return this.http.post<ShelterItem>(`/shelters/${shelterId}`, shelter);
  }

  createShelter(shelter: ShelterItem): Observable<ShelterItem> {
    return this.http.post<ShelterItem>('/shelters', shelter);
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
  enabled: boolean;
  contacts?: ShelterContact[];
}

export interface ShelterContact {
  firstname: string;
  lastname: string;
  phone: string;
}
