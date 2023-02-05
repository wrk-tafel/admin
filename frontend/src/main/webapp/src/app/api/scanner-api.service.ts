import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable()
export class ScannerApiService {
  constructor(
    private http: HttpClient
  ) {
  }

  getScannerIds(): Observable<ScannerIdsResponse> {
    return this.http.get<ScannerIdsResponse>('/scanners');
  }

}

export interface ScannerIdsResponse {
  scannerIds: number[];
}

export interface ScanResult {
  value: number;
}
