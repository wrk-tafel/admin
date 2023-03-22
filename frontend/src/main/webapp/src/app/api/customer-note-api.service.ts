import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CustomerNoteApiService {
  constructor(
    private http: HttpClient
  ) {
  }

  getNotesForCustomer(customerId: number): Observable<CustomerNotesResponse> {
    return this.http.get<CustomerNotesResponse>(`/customers/${customerId}/notes`);
  }

}

export interface CustomerNotesResponse {
  notes: CustomerNoteItem[];
}

export interface CustomerNoteItem {
  author?: string;
  timestamp: Date;
  note: string;
}
