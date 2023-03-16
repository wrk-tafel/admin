import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {WebsocketService} from "../common/websocket/websocket.service";
import {IMessage} from "@stomp/stompjs";
import {map} from "rxjs/operators";

@Injectable({
  providedIn: 'root'
})
export class DistributionApiService {

  constructor(
    private http: HttpClient,
    private websocketService: WebsocketService
  ) {
  }

  getCurrentDistribution(): Observable<DistributionItem> {
    return this.http.get<DistributionItem>('/distributions/current');
  }

  createNewDistribution(): Observable<DistributionItem> {
    return this.http.post<DistributionItem>('/distributions/new', null);
  }

  getStates(): Observable<DistributionStatesResponse> {
    return this.http.get<DistributionStatesResponse>('/distributions/states');
  }

  switchToNextState(): Observable<void> {
    return this.http.post<void>('/distributions/states/next', null);
  }

  subscribeCurrentDistribution(): Observable<DistributionItem> {
    return this.websocketService.watch('/distributions/current').pipe(map(
      (message: IMessage) => {
        const distributionItem: DistributionItem = JSON.parse(message.body);
        return distributionItem;
      }
    ));
  }

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
