import {ApplicationRef, inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {UrlHelperService} from '../util/url-helper.service';

@Injectable({
  providedIn: 'root',
})
export class SseService {
  private readonly urlHelperService = inject(UrlHelperService);
  private readonly appRef = inject(ApplicationRef);

  listen<T>(url: string, connectionStateCallback?: (connected: boolean) => void): Observable<T> {
    return new Observable<T>((observer) => {
      const baseUrl = this.urlHelperService.getBaseUrl();
      let eventSource: EventSource | null = null;

      const connect = () => {
        eventSource = new EventSource(`${baseUrl}/api${url}`);

        eventSource.onopen = () => {
          if (connectionStateCallback) {
            connectionStateCallback(true);
          }
        };

        eventSource.onmessage = (event) => {
          try {
            observer.next(JSON.parse(event.data) as T);
            // Notify Angular's change detection since EventSource callbacks run outside Angular's context
            this.appRef.tick();
          } catch (parseError) {
            console.error('Failed to parse SSE message', parseError, event.data);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error', error);

          if (eventSource?.readyState === EventSource.CLOSED) {
            if (connectionStateCallback) {
              connectionStateCallback(false);
            }

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
