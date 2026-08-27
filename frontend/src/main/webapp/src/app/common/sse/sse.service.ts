import {inject, Service} from '@angular/core';
import {Observable} from 'rxjs';
import {UrlHelperService} from '../util/url-helper.service';

// Backoff bounds for reconnecting a dropped stream. The first retry stays quick because the common
// case is a brief blip that is already over; the ceiling exists because the other case is a stream
// that cannot succeed at all right now - an expired session answering 401, or the backend being
// redeployed - and retrying that twice a second for as long as the tab stays open is a request
// storm against the server and a connection slot spent on nothing.
const RECONNECT_DELAY_MIN_MILLIS = 1000;
const RECONNECT_DELAY_MAX_MILLIS = 30000;

@Service()
export class SseService {
  private readonly urlHelperService = inject(UrlHelperService);

  /**
   * Opens a Server-Sent Events connection to `url` and emits each parsed message.
   *
   * Wraps the native `EventSource` in an `Observable` so callers can use `toSignal()`/`subscribe()`
   * like any other stream. If the connection drops (`EventSource` reports `CLOSED`), it is
   * automatically reconnected, the delay doubling from {@link RECONNECT_DELAY_MIN_MILLIS} up to
   * {@link RECONNECT_DELAY_MAX_MILLIS} until a connection opens again - callers never see the drop
   * as an error on the observable, only as a transient `false` on `connectionStateCallback` if one
   * was passed. Unsubscribing closes the underlying `EventSource` and stops any pending reconnect.
   *
   * Exactly one `EventSource` is open per subscription at any time. That matters beyond tidiness:
   * a browser allows an origin only six concurrent HTTP/1.1 connections and an open SSE stream
   * holds one of them indefinitely, so an extra stream nobody closes is a connection the rest of
   * the application never gets back (see `common/state/global-state.service.ts`).
   *
   * @param url Backend path relative to the API base, e.g. `/sse/dashboard`
   * @param connectionStateCallback Optional hook fired with `true`/`false` on connect/permanent-close
   */
  listen<T>(url: string, connectionStateCallback?: (connected: boolean) => void): Observable<T> {
    return new Observable<T>((observer) => {
      const baseUrl = this.urlHelperService.getBaseUrl();
      let eventSource: EventSource | null = null;
      let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
      let reconnectDelay = RECONNECT_DELAY_MIN_MILLIS;

      const connect = () => {
        eventSource = new EventSource(`${baseUrl}/api${url}`);

        eventSource.onopen = () => {
          // Only a connection that actually opened proves the backend is reachable again, so the
          // backoff is reset here rather than on the attempt being made.
          reconnectDelay = RECONNECT_DELAY_MIN_MILLIS;

          if (connectionStateCallback) {
            connectionStateCallback(true);
          }
        };

        eventSource.onmessage = (event) => {
          try {
            observer.next(JSON.parse(event.data) as T);
          } catch (parseError) {
            // Never log `event.data` here: SSE payloads carry pseudonymous data (household/ticket
            // numbers, scanner values), and this console is also what `ClientLogService` captures
            // and the support form mails along with a report. Log only the event name and the
            // payload length, which is enough to spot a malformed stream without leaking its body.
            console.error('Failed to parse SSE message', parseError, event.type, event.data?.length);
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
        // `onerror` can fire more than once for the same dead connection. Without this guard each
        // of those would schedule its own `connect()`, and since the callbacks all overwrite the
        // one `eventSource`/`reconnectTimeoutId` pair, every stream but the last would be left
        // open with nothing holding a reference to close it.
        if (reconnectTimeoutId !== null) {
          return;
        }

        if (eventSource) {
          eventSource.close();
        }

        reconnectTimeoutId = setTimeout(() => {
          reconnectTimeoutId = null;
          connect();
        }, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_DELAY_MAX_MILLIS);
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
