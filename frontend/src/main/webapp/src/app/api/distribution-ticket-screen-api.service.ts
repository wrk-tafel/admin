import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

@Service()
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

  showPreviousTicket(): Observable<void> {
    return this.http.post<void>('/distributions/ticket-screen/show-previous', undefined);
  }

  showNextTicket(costContributionPaid: boolean): Observable<void> {
    const request: TicketScreenShowNextTicketRequest = {
      costContributionPaid: costContributionPaid,
    };

    return this.http.post<void>('/distributions/ticket-screen/show-next', request);
  }

}

export interface TicketScreenShowTextRequest {
  text: string;
  value: string;
}

export interface TicketScreenShowNextTicketRequest {
  costContributionPaid: boolean;
}
