import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

@Service()
export class DistributionTicketApiService {
  private readonly http = inject(HttpClient);

  getCurrentTicketForCustomer(customerId: number): Observable<TicketNumberResponse> {
    return this.http.get<TicketNumberResponse>('/distributions/tickets/households/' + customerId);
  }

  deleteCurrentTicketOfCustomer(customerId: number): Observable<void> {
    return this.http.delete<void>('/distributions/tickets/households/' + customerId);
  }

}

export interface TicketNumberResponse {
  ticketNumber: number | null;
}
