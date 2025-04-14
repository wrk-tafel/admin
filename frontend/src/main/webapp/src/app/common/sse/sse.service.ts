import {inject, Injectable, NgZone} from '@angular/core';
import {Observable} from 'rxjs';
import {UrlHelperService} from '../util/url-helper.service';

@Injectable({
  providedIn: 'root',
})
export class SseService {
  private readonly urlHelperService = inject(UrlHelperService);
  private readonly ngZone = inject(NgZone);

  listen<T>(url: string): Observable<T> {
    return new Observable<T>((observer) => {
      const baseUrl = this.urlHelperService.getBaseUrl();
      let eventSource: EventSource | null = null;

      const connect = () => {
        eventSource = new EventSource(`${baseUrl}/api${url}`);

        eventSource.onmessage = (event) => {
          this.ngZone.run(() => {
            try {
              observer.next(JSON.parse(event.data) as T);
            } catch (parseError) {
              console.error('Failed to parse SSE message', parseError, event.data);
            }
          });
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error', error);

          if (eventSource?.readyState === EventSource.CLOSED) {
            console.warn('SSE connection permanently closed, trying to reconnect...');
            reconnect();
          }
        };
      };

      const reconnect = () => {
        if (eventSource) {
          eventSource.close();
        }
        // Wait a little before reconnecting
        setTimeout(() => {
          connect();
        }, 1000);
      };

      connect();

      return () => {
        eventSource?.close();
      };
    });
  }

}
