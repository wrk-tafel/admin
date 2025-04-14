import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DistributionTicketApiService {
  private http = inject(HttpClient);

  getCurrentTicket(): Observable<TicketNumberResponse> {
    return this.http.get<TicketNumberResponse>('/distributions/tickets/current');
  }

  getCurrentTicketForCustomer(customerId: number): Observable<TicketNumberResponse> {
    let queryParams = new HttpParams();
    queryParams = queryParams.set('customerId', customerId);
    return this.http.get<TicketNumberResponse>('/distributions/tickets/current', {params: queryParams});
  }

  deleteCurrentTicketOfCustomer(customerId: number): Observable<void> {
    let queryParams = new HttpParams();
    queryParams = queryParams.set('customerId', customerId);
    return this.http.delete<void>('/distributions/tickets/current', {params: queryParams});
  }

  getNextTicket(): Observable<TicketNumberResponse> {
    return this.http.get<TicketNumberResponse>('/distributions/tickets/next');
  }

}

export interface TicketNumberResponse {
  ticketNumber: number;
}
