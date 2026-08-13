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

  showCurrentTicket(): Observable<TicketScreenTicketResponse> {
    return this.http.post<TicketScreenTicketResponse>('/distributions/ticket-screen/show-current', undefined);
  }

  showPreviousTicket(): Observable<TicketScreenTicketResponse> {
    return this.http.post<TicketScreenTicketResponse>('/distributions/ticket-screen/show-previous', undefined);
  }

  showNextTicket(costContributionPaid: boolean): Observable<TicketScreenTicketResponse> {
    const request: TicketScreenShowNextTicketRequest = {
      costContributionPaid: costContributionPaid,
    };

    return this.http.post<TicketScreenTicketResponse>('/distributions/ticket-screen/show-next', request);
  }

}

export interface TicketScreenShowTextRequest {
  text: string;
  value: string;
}

export interface TicketScreenShowNextTicketRequest {
  costContributionPaid: boolean;
}

export interface TicketScreenTicketResponse {
  ticketNumber: number | null;
  householdId: number | null;
  pendingCostContribution: number | null;
  householdName?: string | null;
  processedTicketsCount?: number | null;
  totalTicketsCount?: number | null;
}
