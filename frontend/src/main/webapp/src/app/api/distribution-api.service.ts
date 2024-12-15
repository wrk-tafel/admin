import {HttpClient, HttpResponse} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {WebsocketService} from '../common/websocket/websocket.service';
import {IMessage} from '@stomp/stompjs';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DistributionApiService {
  private readonly http = inject(HttpClient);
  private readonly websocketService = inject(WebsocketService);

  createNewDistribution(): Observable<void> {
    return this.http.post<void>('/distributions/new', null);
  }

  closeDistribution(): Observable<void> {
    return this.http.post<void>('/distributions/close', null);
  }

  getCurrentDistribution(): Observable<DistributionItem> {
    return this.websocketService.watch('/topic/distributions').pipe(map(
      (message: IMessage) => {
        const response: DistributionItemResponse = JSON.parse(message.body);
        return response.distribution;
      }
    ));
  }

  assignCustomer(customerId: number, ticketNumber: number): Observable<void> {
    const body: AssignCustomerRequest = {
      customerId: customerId,
      ticketNumber: ticketNumber
    };
    return this.http.post<void>('/distributions/customers', body);
  }

  saveStatisticData(employeeCount: number, personsInShelterCount: number): Observable<void> {
    const body: SaveDistributionStatisticRequest = {
      employeeCount: employeeCount,
      personsInShelterCount: personsInShelterCount
    };
    return this.http.post<void>('/distributions/statistics', body);
  }

  downloadCustomerList(): Observable<HttpResponse<Blob>> {
    return this.http.get('/distributions/customers/generate-pdf',
      {
        responseType: 'blob',
        observe: 'response'
      });
  }

}

export interface DistributionItemResponse {
  distribution: DistributionItem;
}

export interface DistributionItem {
  id: number;
}

export interface AssignCustomerRequest {
  customerId: number;
  ticketNumber: number;
}

export interface SaveDistributionStatisticRequest {
  employeeCount: number;
  personsInShelterCount: number;
}
