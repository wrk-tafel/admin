import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DistributionApiService {

  constructor(
    private http: HttpClient
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
