import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {SseService} from '../common/sse/sse.service';

@Service()
export class DocumentScannerApiService {
  private http = inject(HttpClient);
  private sseService = inject(SseService);

  getScannerFiles(): Observable<ScannerFilesResponse> {
    return this.http.get<ScannerFilesResponse>('/document-scanner-files');
  }

  listenForScannerFileChanges(): Observable<ScannerFilesResponse> {
    return this.sseService.listen<ScannerFilesResponse>('/sse/document-scanner-files');
  }
}

export interface ScannerFilesResponse {
  items: ScannerFileItem[];
}

export interface ScannerFileItem {
  fileName: string;
  sizeBytes: number;
  modifiedAt: Date;
}
