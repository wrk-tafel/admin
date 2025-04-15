import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScannerApiService {
  private readonly http = inject(HttpClient);

  registerScanner(scannerId?: number): Observable<ScannerRegistration> {
    let params = new HttpParams();
    if (scannerId) {
      params = params.set('scannerId', scannerId);
    }

    return this.http.post<ScannerRegistration>('/scanners/register', undefined, {
      params: params
    });
  }

  sendScanResult(scannerId: number, scanResult: number) {
    return this.http.post<ScannerRegistration>(`/scanners/${scannerId}/results`, undefined, {
      params: new HttpParams().set('scanResult', scanResult)
    });
  }

  getScanners(): Observable<ScannerList> {
    return this.http.get<ScannerList>(`/scanners`);
  }
}

export interface ScannerRegistration {
  scannerId: number;
}

export interface ScannerList {
  scannerIds: number[];
}
