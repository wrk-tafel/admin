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

  startDistribution(): Observable<DistributionItem> {
    return this.http.post<DistributionItem>('/distributions/start', null);
  }

  stopDistribution(distributionId: number): Observable<void> {
    return this.http.post<void>(`/distributions/${distributionId}/stop`, null);
  }

}

export interface DistributionItem {
  id: number;
}
