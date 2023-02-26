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

}

export interface DistributionItem {
  id: number;
}
