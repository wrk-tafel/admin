import {HttpClient, HttpContext, HttpParams, HttpResponse} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';

@Service()
export class DistributionApiService {
  private readonly http = inject(HttpClient);

  getDistributions(): Observable<DistributionListResponse> {
    return this.http.get<DistributionListResponse>('/distributions');
  }

  createNewDistribution(): Observable<void> {
    return this.http.post<void>('/distributions/new', null);
  }

  closeDistribution(forceClose: boolean): Observable<DistributionCloseValidationResult | null> {
    let queryParams = new HttpParams();
    if (forceClose) {
      queryParams = queryParams.set('forceClose', forceClose);
    }
    return this.http.post<DistributionCloseValidationResult>('/distributions/close', null, {params: queryParams});
  }

  assignCustomer(customerId: number, ticketNumber: number, context?: HttpContext): Observable<void> {
    // the backend identifies the customer by its household id (same number as before)
    const body: AssignHouseholdRequest = {
      householdId: customerId,
      ticketNumber: ticketNumber,
    };
    return this.http.post<void>('/distributions/households', body, {context});
  }

  saveStatistic(employeeCount: number, selectedShelterIds: number[]): Observable<void> {
    const body: SaveDistributionStatisticRequest = {
      employeeCount: employeeCount,
      selectedShelterIds: selectedShelterIds
    };
    return this.http.post<void>('/distributions/statistics', body);
  }

  saveNotes(notes: string): Observable<void> {
    const body: SaveDistributionNotesRequest = {
      notes: notes
    };
    return this.http.post<void>('/distributions/notes', body);
  }

  downloadCustomerList(): Observable<HttpResponse<Blob>> {
    return this.http.get('/distributions/households/generate-pdf',
      {
        responseType: 'blob',
        observe: 'response'
      });
  }

  sendMails(distributionId: number): Observable<DistributionSendMailsResponse> {
    return this.http.post<DistributionSendMailsResponse>(`/distributions/${distributionId}/send-mails`, undefined);
  }

}

export interface DistributionListResponse {
  items: DistributionItem[];
}

/** How many mails a resend put in the queue - none, when no recipients are configured. */
export interface DistributionSendMailsResponse {
  queuedMails: number;
}

export interface DistributionItemUpdate {
  distribution: DistributionItem | null;
}

export interface DistributionItem {
  id: number;
  startedAt: Date;
  endedAt?: Date;
}

export interface AssignCustomerRequest {
  customerId: number;
  ticketNumber: number;
}

/** Backend wire format for {@link AssignCustomerRequest} - intentionally not exported. */
interface AssignHouseholdRequest {
  householdId: number;
  ticketNumber: number;
}

export interface SaveDistributionStatisticRequest {
  employeeCount: number;
  selectedShelterIds: number[];
}

export interface SaveDistributionNotesRequest {
  notes: string;
}

export interface DistributionCloseValidationResult {
  errors: string[];
  warnings: string[];
}
