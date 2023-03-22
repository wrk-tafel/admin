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

  createNewNote(customerId: number, note: string): Observable<CustomerNoteItem> {
    const request: CreateCustomerNoteRequest = {note: note};
    return this.http.post<CustomerNoteItem>(`/customers/${customerId}/notes`, request);
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

export interface CreateCustomerNoteRequest {
  note: string;
}
