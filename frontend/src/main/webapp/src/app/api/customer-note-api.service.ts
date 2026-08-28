import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {PagedResponse} from '../common/api/paged-response';

@Service()
export class CustomerNoteApiService {
  private http = inject(HttpClient);

  getNotesForCustomer(customerId: number, page?: number, pageSize?: number): Observable<CustomerNotesResponse> {
    let queryParams = new HttpParams();
    if (page) {
      queryParams = queryParams.set('page', page);
    }
    if (pageSize) {
      queryParams = queryParams.set('pageSize', pageSize);
    }
    return this.http.get<CustomerNotesResponse>(`/households/${customerId}/notes`, {params: queryParams});
  }

  createNewNote(customerId: number, note: string): Observable<CustomerNoteItem> {
    const request: CreateCustomerNoteRequest = {note: note};
    return this.http.post<CustomerNoteItem>(`/households/${customerId}/notes`, request);
  }

  updateNote(customerId: number, noteId: number, note: string): Observable<CustomerNoteItem> {
    const request: UpdateCustomerNoteRequest = {note: note};
    return this.http.put<CustomerNoteItem>(`/households/${customerId}/notes/${noteId}`, request);
  }

  deleteNote(customerId: number, noteId: number): Observable<void> {
    return this.http.delete<void>(`/households/${customerId}/notes/${noteId}`);
  }

}

export type CustomerNotesResponse = PagedResponse<CustomerNoteItem>;

export interface CustomerNoteItem {
  id: number;
  author?: string;
  timestamp: Date;
  note: string;
}

export interface CreateCustomerNoteRequest {
  note: string;
}

export interface UpdateCustomerNoteRequest {
  note: string;
}
