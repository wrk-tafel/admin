import {inject, Injectable, NgZone} from '@angular/core';
import {Observable} from 'rxjs';
import {UrlHelperService} from '../util/url-helper.service';

@Injectable({
  providedIn: 'root',
})
export class SseService {
  private readonly urlHelperService = inject(UrlHelperService);
  private readonly ngZone = inject(NgZone);

  private retryCount = 0;

  listen<T>(url: string, maxRetries: number = 0): Observable<T> {
    this.retryCount = 0;

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

        if (maxRetries > 0 && this.retryCount >= maxRetries) {
          console.error('Max retries reached, stopping reconnection attempts.');
          observer.next(null);
          observer.complete();
          return;
        } else {
          this.retryCount++;
          console.warn(`Reconnecting... Attempt ${this.retryCount}`);
        }

        // Wait a little before reconnecting
        setTimeout(() => {
          connect();
        }, 500);
      };

      connect();

      return () => {
        eventSource?.close();
      };
    });
  }

}
