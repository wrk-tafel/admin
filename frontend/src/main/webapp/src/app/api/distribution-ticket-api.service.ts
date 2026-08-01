import {HttpClient, HttpContext} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

@Service()
export class DistributionTicketApiService {
  private readonly http = inject(HttpClient);

  getCurrentTicketForCustomer(customerId: number): Observable<TicketNumberResponse> {
    return this.http.get<TicketNumberResponse>(`/households/${customerId}/ticket`);
  }

  deleteCurrentTicketOfCustomer(customerId: number, context?: HttpContext): Observable<void> {
    return this.http.delete<void>(`/households/${customerId}/ticket`, {context});
  }

}

export interface TicketNumberResponse {
  ticketNumber: number | null;
}
