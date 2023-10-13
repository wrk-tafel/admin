import {HttpClient, HttpParams} from '@angular/common/http';
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

  getNotesForCustomer(customerId: number, page?: number): Observable<CustomerNotesResponse> {
    let queryParams = new HttpParams();
    if (page) {
      queryParams = queryParams.set('page', page);
    }
    return this.http.get<CustomerNotesResponse>(`/customers/${customerId}/notes`, {params: queryParams});
  }

  createNewNote(customerId: number, note: string): Observable<CustomerNoteItem> {
    const request: CreateCustomerNoteRequest = {note: note};
    return this.http.post<CustomerNoteItem>(`/customers/${customerId}/notes`, request);
  }

}

export interface CustomerNotesResponse {
  items: CustomerNoteItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export interface CustomerNoteItem {
  author?: string;
  timestamp: Date;
  note: string;
}

export interface CreateCustomerNoteRequest {
  note: string;
}
