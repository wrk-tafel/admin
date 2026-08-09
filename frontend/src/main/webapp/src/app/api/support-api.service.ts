import {HttpClient} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {ClientLogEntry} from '../common/support/client-log.service';

@Service()
export class SupportApiService {
  private readonly http = inject(HttpClient);

  createSupportRequest(title: string, text: string, clientContext?: SupportClientContext): Observable<void> {
    return this.http.post<void>('/support', {title, text, clientContext});
  }
}

/**
 * The technical context mailed along with a support request - collected by `SupportContextService`,
 * optional on the wire so a request still goes out when the browser can't tell us something.
 */
export interface SupportClientContext {
  page: string;
  userAgent: string;
  viewport: string;
  screen: string;
  language: string;
  timeZone: string;
  recentErrors: ClientLogEntry[];
}
