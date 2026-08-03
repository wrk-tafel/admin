import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {UrlHelperService} from '../util/url-helper.service';

@Service()
export class SseService {
  private readonly urlHelperService = inject(UrlHelperService);

  /**
   * Opens a Server-Sent Events connection to `url` and emits each parsed message.
   *
   * Wraps the native `EventSource` in an `Observable` so callers can use `toSignal()`/`subscribe()`
   * like any other stream. If the connection drops (`EventSource` reports `CLOSED`), it is
   * automatically reconnected after a fixed 1s delay - callers never see the drop as an error on
   * the observable, only as a transient `false` on `connectionStateCallback` if one was passed.
   * Unsubscribing closes the underlying `EventSource` and stops any pending reconnect.
   *
   * @param url Backend path relative to the API base, e.g. `/sse/dashboard`
   * @param connectionStateCallback Optional hook fired with `true`/`false` on connect/permanent-close
   */
  listen<T>(url: string, connectionStateCallback?: (connected: boolean) => void): Observable<T> {
    return new Observable<T>((observer) => {
      const baseUrl = this.urlHelperService.getBaseUrl();
      let eventSource: EventSource | null = null;
      let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

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
        reconnectTimeoutId = setTimeout(() => {
          reconnectTimeoutId = null;
          connect();
        }, 1000);
      };

      connect();

      return () => {
        if (reconnectTimeoutId !== null) {
          clearTimeout(reconnectTimeoutId);
        }
        eventSource?.close();
      };
    });
  }

}
