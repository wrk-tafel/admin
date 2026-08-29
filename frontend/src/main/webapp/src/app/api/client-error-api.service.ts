import {HttpClient, HttpContext} from '@angular/common/http';
import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {SUPPRESS_ERROR_TOAST} from '../common/http/suppress-error-toast.token';
import {SUPPRESS_CLIENT_LOG_RECORD} from '../common/http/suppress-client-log-record.token';

@Service()
export class ClientErrorApiService {
  private readonly http = inject(HttpClient);

  /**
   * A failed call is silently swallowed by the caller - see `ClientErrorReportingService` -
   * so it never shows the generic error toast nor records itself as another client error, which
   * would otherwise re-report itself in a loop.
   */
  private static readonly CONTEXT = new HttpContext()
    .set(SUPPRESS_ERROR_TOAST, true)
    .set(SUPPRESS_CLIENT_LOG_RECORD, true);

  reportClientError(message: string, page?: string, userAgent?: string): Observable<void> {
    return this.http.post<void>('/client-errors', {message, page, userAgent}, {context: ClientErrorApiService.CONTEXT});
  }
}
