import {HttpClient, HttpResponse} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DistributionApiService {
  private readonly http = inject(HttpClient);

  createNewDistribution(): Observable<void> {
    return this.http.post<void>('/distributions/new', null);
  }

  closeDistribution(): Observable<void> {
    return this.http.post<void>('/distributions/close', null);
  }

  assignCustomer(customerId: number, ticketNumber: number, costContributionPaid: boolean): Observable<void> {
    const body: AssignCustomerRequest = {
      customerId: customerId,
      ticketNumber: ticketNumber,
      costContributionPaid: costContributionPaid
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

}

export interface DistributionItemUpdate {
  distribution: DistributionItem;
}

export interface DistributionItem {
  id: number;
}

export interface AssignCustomerRequest {
  customerId: number;
  ticketNumber: number;
  costContributionPaid: boolean;
}

export interface SaveDistributionStatisticRequest {
  employeeCount: number;
  selectedShelterIds: number[];
}

export interface SaveDistributionNotesRequest {
  notes: string;
}
