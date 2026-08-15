import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

@Service()
export class ShelterApiService {
  private readonly http = inject(HttpClient);

  getActiveShelters(): Observable<ShelterListResponse> {
    return this.http.get<ShelterListResponse>('/shelters/active');
  }

  getAllShelters(): Observable<ShelterListResponse> {
    return this.http.get<ShelterListResponse>('/shelters');
  }

  updateShelter(shelterId: number, shelter: ShelterItem): Observable<ShelterItem> {
    return this.http.put<ShelterItem>(`/shelters/${shelterId}`, shelter);
  }

  createShelter(shelter: ShelterItem): Observable<ShelterItem> {
    return this.http.post<ShelterItem>('/shelters', shelter);
  }

  reorderShelters(shelterIds: number[]): Observable<ShelterListResponse> {
    return this.http.post<ShelterListResponse>('/shelters/reorder', {shelterIds});
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
  sortOrder: number;
  contacts?: ShelterContact[];
}

export interface ShelterContact {
  // a contact may be just a phone number - the backend keeps both name parts nullable
  firstname?: string;
  lastname?: string;
  phone: string;
}
