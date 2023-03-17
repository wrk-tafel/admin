import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TicketApiService {

  constructor(
    private http: HttpClient
  ) {
  }

  getNextTicket(): Observable<NextTicketResponse> {
    return this.http.get<NextTicketResponse>('/tickets/next');
  }
}

export interface NextTicketResponse {
  ticketNumber: number;
}
