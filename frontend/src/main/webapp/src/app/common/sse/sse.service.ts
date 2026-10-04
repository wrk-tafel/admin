import {inject, Service} from '@angular/core';
import {Observable, Subject} from 'rxjs';
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

// The Angular service worker handles every request in its scope, a stream included: it fetches it
// itself and pipes the body through to the page. A browser may stop an idle service worker - Firefox
// does after 30 seconds - and the stream it was piping ends with it, so the tab would reconnect twice
// a minute for as long as it is open. A request carrying this parameter is one the service worker
// leaves to the browser.
const SERVICE_WORKER_BYPASS = 'ngsw-bypass=true';

/**
 * The topics the backend's `GET /api/sse/events` offers (`SseTopic.name` there). The event a topic
 * sends carries the same name.
 */
export type SseTopicName =
  | 'distribution'
  | 'config'
  | 'notifications'
  | 'dashboard'
  | 'ticket-screen'
  | 'scanner-results'
  | 'scanner-files';

export interface SseTopicOptions {
  /** The part after the colon of `name:argument`, e.g. the scanner id of `scanner-results`. */
  argument?: string | number;
  /**
   * Told whether the stream is connected: right away when it already is, and on every later change.
   * The state belongs to the one shared stream, so every subscriber hears the same thing.
   */
  connectionStateCallback?: (connected: boolean) => void;
}

interface Subscriber {
  next: (data: unknown) => void;
  connectionStateCallback?: (connected: boolean) => void;
}

/**
 * The tab's single Server-Sent Events connection. Every screen asks for the topics it needs with
 * [topic]; the service keeps one `EventSource` open for the union of what is currently subscribed
 * and hands each event to the subscribers of its topic. When the set changes - a screen with its own
 * topic opens or closes - the connection is replaced by one for the new set, in the next microtask
 * so that several subscriptions made together cost one reconnect.
 *
 * A stream needs a session the server accepts, and this service cannot know about sessions (the
 * authentication service depends on it, not the other way round). `SseSessionService` tells it:
 * {@link setEnabled} closes the stream while nobody is fully logged in, and {@link refused} is how
 * it learns that the server turned a stream down.
 */
@Service()
export class SseService {
  private readonly urlHelperService = inject(UrlHelperService);

  private readonly subscribers = new Map<string, Set<Subscriber>>();
  private eventSource: EventSource | null = null;
  private connectedTopics: string | null = null;
  private connected = false;
  private refreshScheduled = false;

  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = RECONNECT_DELAY_MIN_MILLIS;
  private disconnectGraceTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private consecutiveFailures = 0;
  private enabled = true;
  private readonly refusedSubject = new Subject<void>();

  /**
   * Emits whenever the server answered a stream with something other than an event stream - the
   * browser gives up on it (`CLOSED`) instead of retrying by itself. `EventSource` does not say
   * which status that was, so a subscriber that wants to tell an expired session from a backend
   * that is restarting has to ask the server.
   */
  readonly refused: Observable<void> = this.refusedSubject.asObservable();

  /**
   * Whether a stream may be open at all. While `false` the subscriptions are kept but no request is
   * made - a stream the server would refuse is not worth retrying every 30 seconds for as long as
   * the tab stays open - and switching back to `true` connects for whatever is subscribed by then.
   */
  setEnabled(enabled: boolean) {
    if (this.enabled === enabled) {
      return;
    }
    this.enabled = enabled;
    this.refresh();
  }

  /**
   * Emits every message of one topic, parsed. The observable never errors: a dropped connection is
   * reconnected with backoff and only shows as `false` on the `connectionStateCallback`.
   * Unsubscribing gives the topic up; the connection closes when nothing is left to listen for.
   */
  topic<T>(name: SseTopicName, options: SseTopicOptions = {}): Observable<T> {
    const key = options.argument === undefined ? name : `${name}:${options.argument}`;

    return new Observable<T>((observer) => {
      const subscriber: Subscriber = {
        next: (data) => observer.next(data as T),
        connectionStateCallback: options.connectionStateCallback
      };

      let entries = this.subscribers.get(key);
      if (!entries) {
        entries = new Set();
        this.subscribers.set(key, entries);
      }
      entries.add(subscriber);
      this.scheduleRefresh();

      // A connection that is already open will not announce itself again to a late subscriber.
      if (this.connected) {
        options.connectionStateCallback?.(true);
      }

      return () => {
        const remaining = this.subscribers.get(key);
        remaining?.delete(subscriber);
        if (remaining?.size === 0) {
          this.subscribers.delete(key);
        }
        this.scheduleRefresh();
      };
    });
  }

  private scheduleRefresh() {
    if (this.refreshScheduled) {
      return;
    }
    this.refreshScheduled = true;
    queueMicrotask(() => {
      this.refreshScheduled = false;
      this.refresh();
    });
  }

  private wantedTopics(): string {
    if (!this.enabled) {
      return '';
    }
    return [...this.subscribers.keys()].sort().map(encodeURIComponent).join(',');
  }

  /** Brings the connection in line with what is subscribed right now. */
  private refresh() {
    const wanted = this.wantedTopics();
    if (wanted === this.connectedTopics) {
      return;
    }

    this.teardown();
    this.connectedTopics = wanted === '' ? null : wanted;
    if (wanted === '') {
      // Subscribers exist here only when the stream was switched off underneath them.
      this.setConnected(false, true);
      return;
    }

    this.reconnectDelay = RECONNECT_DELAY_MIN_MILLIS;
    this.consecutiveFailures = 0;
    this.connect(wanted);
  }

  private teardown() {
    if (this.reconnectTimeoutId !== null) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    this.clearDisconnectGrace();
    this.eventSource?.close();
    this.eventSource = null;
  }

  private connect(topics: string) {
    const baseUrl = this.urlHelperService.getBaseUrl();
    const url = `/sse/events?topics=${topics}&${SERVICE_WORKER_BYPASS}`;
    const eventSource = new EventSource(`${baseUrl}/api${url}`);
    this.eventSource = eventSource;

    [...this.subscribers.keys()].map(key => key.split(':')[0]).forEach((name, index, names) => {
      if (names.indexOf(name) === index) {
        eventSource.addEventListener(name, (event) => this.dispatch(name, event as MessageEvent));
      }
    });

    eventSource.onopen = () => {
      // Only a connection that actually opened proves the backend is reachable again, so the
      // backoff and failure streak are reset here rather than on the attempt being made.
      this.reconnectDelay = RECONNECT_DELAY_MIN_MILLIS;
      this.consecutiveFailures = 0;
      this.clearDisconnectGrace();
      this.setConnected(true, true);
    };

    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) {
        this.clearDisconnectGrace();
        this.setConnected(false, true);
        this.reconnect(url);
        this.refusedSubject.next();
      } else if (eventSource.readyState === EventSource.CONNECTING && this.disconnectGraceTimeoutId === null) {
        // A network-level failure leaves the native EventSource retrying in CONNECTING forever
        // rather than ever reaching CLOSED, so the branch above never fires for it and nothing
        // would otherwise report the drop - see #3530. Report it as disconnected once the grace
        // period has passed without the browser's own retry succeeding - the only place in this
        // branch where the drop is proven persistent rather than a blip the browser recovers
        // from on its own, so it's also the only place here worth a captured `console.error`.
        this.disconnectGraceTimeoutId = setTimeout(() => {
          this.disconnectGraceTimeoutId = null;

          if (eventSource.readyState !== EventSource.OPEN) {
            this.setConnected(false, true);
            console.error(
              `SSE connection to ${url} not recovered within ${DISCONNECT_GRACE_MILLIS}ms (readyState=${eventSource.readyState})`
            );
          }
        }, DISCONNECT_GRACE_MILLIS);
      }
    };
  }

  private dispatch(name: string, event: MessageEvent) {
    let data: unknown;
    try {
      data = JSON.parse(event.data);
    } catch (parseError) {
      // Never log `event.data` here: SSE payloads carry pseudonymous data (household/ticket
      // numbers, scanner values), and this console is also what `ClientLogService` captures
      // and the support form mails along with a report. Log only the event name and the
      // payload length, which is enough to spot a malformed stream without leaking its body.
      console.error('Failed to parse SSE message', parseError, name, event.data?.length);
      return;
    }

    this.subscribers.forEach((entries, key) => {
      if (key.split(':')[0] === name) {
        [...entries].forEach(subscriber => subscriber.next(data));
      }
    });
  }

  private setConnected(connected: boolean, notify: boolean) {
    this.connected = connected;
    if (notify) {
      this.subscribers.forEach(entries => entries.forEach(subscriber => subscriber.connectionStateCallback?.(connected)));
    }
  }

  private clearDisconnectGrace() {
    if (this.disconnectGraceTimeoutId !== null) {
      clearTimeout(this.disconnectGraceTimeoutId);
      this.disconnectGraceTimeoutId = null;
    }
  }

  private reconnect(url: string) {
    // `onerror` can fire more than once for the same dead connection. Without this guard each
    // of those would schedule its own `connect()`, and since the callbacks all overwrite the
    // one `eventSource`/`reconnectTimeoutId` pair, every stream but the last would be left
    // open with nothing holding a reference to close it.
    if (this.reconnectTimeoutId !== null) {
      return;
    }

    // A single drop that reconnects right away is routine SSE lifecycle (proxy idle timeout,
    // phone screen off, a brief network blip) and self-heals via the retry below - logging it
    // via `console.warn`/`console.error` would mean `ClientErrorReportingService` reports it as
    // a client error on every one of these, which is most of `app.log`'s WARN volume in
    // practice (`ClientLogService.captureConsoleMessages` only intercepts those two levels, not
    // `console.log`). Only a *repeated* failure without a successful reopen in between is
    // escalated to a captured `console.error`.
    this.consecutiveFailures++;
    if (this.consecutiveFailures > 1) {
      console.error(
        `SSE connection to ${url} still failing after ${this.consecutiveFailures} attempts, retrying in ${this.reconnectDelay}ms`
      );
    } else {
      console.log(`SSE connection to ${url} closed, trying to reconnect...`);
    }

    this.eventSource?.close();

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = null;
      const wanted = this.wantedTopics();
      this.connectedTopics = wanted === '' ? null : wanted;
      if (wanted !== '') {
        this.connect(wanted);
      }
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_DELAY_MAX_MILLIS);
  }
}
