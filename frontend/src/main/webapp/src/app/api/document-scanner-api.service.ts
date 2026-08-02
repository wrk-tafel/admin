import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {SseService} from '../common/sse/sse.service';
import {UrlHelperService} from '../common/util/url-helper.service';

@Service()
export class DocumentScannerApiService {
  private http = inject(HttpClient);
  private sseService = inject(SseService);
  private urlHelperService = inject(UrlHelperService);

  getScannerFiles(): Observable<ScannerFilesResponse> {
    return this.http.get<ScannerFilesResponse>('/document-scanner-files');
  }

  listenForScannerFileChanges(): Observable<ScannerFilesResponse> {
    return this.sseService.listen<ScannerFilesResponse>('/sse/document-scanner-files');
  }

  /**
   * Absolute URL to a scanner file's raw content - used directly as an <img>/<a> src/href rather
   * than via HttpClient, so the browser handles rendering (image preview) or opening (PDF) itself.
   * Same-origin cookie auth (see SseService) means no extra auth wiring is needed here either.
   */
  getScannerFileContentUrl(fileName: string): string {
    return `${this.urlHelperService.getBaseUrl()}/api/document-scanner-files/${encodeURIComponent(fileName)}/content`;
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
