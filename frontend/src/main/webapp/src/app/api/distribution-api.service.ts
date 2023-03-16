import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {WebsocketService} from '../common/websocket/websocket.service';
import {IMessage} from '@stomp/stompjs';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DistributionApiService {

  constructor(
    private http: HttpClient,
    private websocketService: WebsocketService
  ) {
  }

  createNewDistribution(): Observable<void> {
    return this.http.post<void>('/distributions/new', null);
  }

  getStates(): Observable<DistributionStatesResponse> {
    return this.http.get<DistributionStatesResponse>('/distributions/states');
  }

  switchToNextState(): Observable<void> {
    return this.http.post<void>('/distributions/states/next', null);
  }

  getCurrentDistribution(): Observable<DistributionItem> {
    return this.websocketService.watch('/topic/distributions').pipe(map(
      (message: IMessage) => {
        const response: DistributionItemResponse = JSON.parse(message.body);
        return response.distribution;
      }
    ));
  }

}

export interface DistributionItemResponse {
  distribution: DistributionItem;
}

export interface DistributionItem {
  id: number;
  state: DistributionStateItem;
}

export interface DistributionStatesResponse {
  states: DistributionStateItem[];
  currentState: DistributionStateItem;
}

export interface DistributionStateItem {
  name: string;
  stateLabel: string;
  actionLabel?: string;
}
