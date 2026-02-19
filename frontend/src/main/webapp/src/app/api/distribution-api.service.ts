import {HttpClient, HttpParams, HttpResponse} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DistributionApiService {
  private readonly http = inject(HttpClient);

  getDistributions(): Observable<DistributionListResponse> {
    return this.http.get<DistributionListResponse>('/distributions');
  }

  createNewDistribution(): Observable<void> {
    return this.http.post<void>('/distributions/new', null);
  }

  closeDistribution(forceClose: boolean): Observable<DistributionCloseValidationResult> {
    let queryParams = new HttpParams();
    if (forceClose) {
      queryParams = queryParams.set('forceClose', forceClose);
    }
    return this.http.post<DistributionCloseValidationResult>('/distributions/close', null, {params: queryParams});
  }

  assignCustomer(customerId: number, ticketNumber: number): Observable<void> {
    const body: AssignCustomerRequest = {
      customerId: customerId,
      ticketNumber: ticketNumber,
    };
    return this.http.post<void>('/distributions/customers', body);
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
    return this.http.get('/distributions/customers/generate-pdf',
      {
        responseType: 'blob',
        observe: 'response'
      });
  }

  sendMails(distributionId: number): Observable<void> {
    return this.http.post<void>(`/distributions/${distributionId}/send-mails`, undefined);
  }

}

export interface DistributionListResponse {
  items: DistributionItem[];
}

export interface DistributionItemUpdate {
  distribution: DistributionItem;
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
