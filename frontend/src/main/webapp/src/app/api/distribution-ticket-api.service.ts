import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DistributionTicketApiService {

  constructor(
    private http: HttpClient
  ) {
  }

  getCurrentTicket(): Observable<TicketNumberResponse> {
    return this.http.get<TicketNumberResponse>('/distributions/tickets/current');
  }

  getNextTicket(): Observable<TicketNumberResponse> {
    return this.http.get<TicketNumberResponse>('/distributions/tickets/next');
  }

}

export interface TicketNumberResponse {
  ticketNumber: number;
}
