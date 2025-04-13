import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DistributionTicketScreenApiService {
  private readonly http = inject(HttpClient);

  showText(text: string, value: string): Observable<void> {
    const request: TicketScreenShowTextRequest = {
      text: text,
      value: value
    };

    return this.http.post<void>('/distributions/ticket-screen/show-text', request);
  }

  showCurrentTicket(): Observable<void> {
    return this.http.post<void>('/distributions/ticket-screen/show-current', undefined);
  }

  showNextTicket(): Observable<void> {
    return this.http.post<void>('/distributions/ticket-screen/show-next', undefined);
  }

}

export interface TicketScreenShowTextRequest {
  text: string;
  value: string;
}
