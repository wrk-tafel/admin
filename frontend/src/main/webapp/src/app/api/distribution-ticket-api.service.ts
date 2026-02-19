import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DistributionTicketApiService {
  private readonly http = inject(HttpClient);

  getCurrentTicketForCustomer(customerId: number): Observable<TicketNumberResponse> {
    return this.http.get<TicketNumberResponse>('/distributions/tickets/customers/' + customerId);
  }

  deleteCurrentTicketOfCustomer(customerId: number): Observable<void> {
    return this.http.delete<void>('/distributions/tickets/customers/' + customerId);
  }

}

export interface TicketNumberResponse {
  ticketNumber: number;
}
