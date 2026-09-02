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

// On a network-level failure (as opposed to the server sending a fatal response), the native
// `EventSource` keeps retrying on its own and never reaches `CLOSED` - it sits in `CONNECTING`
// indefinitely instead, which is why `onerror` alone can't be trusted to report a drop. Give the
// browser's own retry this long to succeed before telling the caller the connection is down.
const DISCONNECT_GRACE_MILLIS = 5000;

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
      let disconnectGraceTimeoutId: ReturnType<typeof setTimeout> | null = null;
      let consecutiveFailures = 0;

      const clearDisconnectGrace = () => {
        if (disconnectGraceTimeoutId !== null) {
          clearTimeout(disconnectGraceTimeoutId);
          disconnectGraceTimeoutId = null;
        }
      };

      const connect = () => {
        eventSource = new EventSource(`${baseUrl}/api${url}`);

        eventSource.onopen = () => {
          // Only a connection that actually opened proves the backend is reachable again, so the
          // backoff and failure streak are reset here rather than on the attempt being made.
          reconnectDelay = RECONNECT_DELAY_MIN_MILLIS;
          consecutiveFailures = 0;
          clearDisconnectGrace();

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

        eventSource.onerror = () => {
          if (eventSource?.readyState === EventSource.CLOSED) {
            clearDisconnectGrace();

            if (connectionStateCallback) {
              connectionStateCallback(false);
            }

            reconnect();
          } else if (eventSource?.readyState === EventSource.CONNECTING && disconnectGraceTimeoutId === null) {
            // A network-level failure leaves the native EventSource retrying in CONNECTING forever
            // rather than ever reaching CLOSED, so the branch above never fires for it and nothing
            // would otherwise report the drop - see #3530. Report it as disconnected once the grace
            // period has passed without the browser's own retry succeeding - the only place in this
            // branch where the drop is proven persistent rather than a blip the browser recovers
            // from on its own, so it's also the only place here worth a captured `console.error`.
            disconnectGraceTimeoutId = setTimeout(() => {
              disconnectGraceTimeoutId = null;

              if (eventSource?.readyState !== EventSource.OPEN) {
                if (connectionStateCallback) {
                  connectionStateCallback(false);
                }
                console.error(
                  `SSE connection to ${url} not recovered within ${DISCONNECT_GRACE_MILLIS}ms (readyState=${eventSource?.readyState})`
                );
              }
            }, DISCONNECT_GRACE_MILLIS);
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

        // A single drop that reconnects right away is routine SSE lifecycle (proxy idle timeout,
        // phone screen off, a brief network blip) and self-heals via the retry below - logging it
        // via `console.warn`/`console.error` would mean `ClientErrorReportingService` reports it as
        // a client error on every one of these, which is most of `app.log`'s WARN volume in
        // practice (`ClientLogService.captureConsoleMessages` only intercepts those two levels, not
        // `console.log`). Only a *repeated* failure without a successful reopen in between is
        // escalated to a captured `console.error`.
        consecutiveFailures++;
        if (consecutiveFailures > 1) {
          console.error(
            `SSE connection to ${url} still failing after ${consecutiveFailures} attempts, retrying in ${reconnectDelay}ms`
          );
        } else {
          console.log(`SSE connection to ${url} closed, trying to reconnect...`);
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
        clearDisconnectGrace();
        eventSource?.close();
      };
    });
  }

}
