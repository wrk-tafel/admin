import { TestBed } from '@angular/core/testing';
import { SseService } from './sse.service';
import { UrlHelperService } from '../util/url-helper.service';

class FakeEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly CONNECTING = FakeEventSource.CONNECTING;
  readonly OPEN = FakeEventSource.OPEN;
  readonly CLOSED = FakeEventSource.CLOSED;

  readyState = FakeEventSource.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readonly close = vi.fn(() => {
    this.readyState = FakeEventSource.CLOSED;
  });

  constructor(public readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  static instances: FakeEventSource[] = [];

  static reset() {
    FakeEventSource.instances = [];
  }

  static latest(): FakeEventSource {
    return FakeEventSource.instances[FakeEventSource.instances.length - 1];
  }
}

describe('SseService', () => {
  const BASE_URL = 'http://localhost:4200';
  let originalEventSource: typeof EventSource;

  beforeEach(() => {
    originalEventSource = globalThis.EventSource;
    globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;
    FakeEventSource.reset();
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [
        SseService,
        { provide: UrlHelperService, useValue: { getBaseUrl: () => BASE_URL } }
      ]
    });
  });

  afterEach(() => {
    globalThis.EventSource = originalEventSource;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function setup() {
    return TestBed.inject(SseService);
  }

  it('opens an EventSource against the given path and emits parsed messages', () => {
    const service = setup();
    const received: unknown[] = [];
    service.listen<{ value: string }>('/sse/dashboard').subscribe((data) => received.push(data));

    expect(FakeEventSource.latest().url).toBe(`${BASE_URL}/api/sse/dashboard`);

    FakeEventSource.latest().onmessage!({ data: JSON.stringify({ value: 'hello' }) } as MessageEvent);

    expect(received).toEqual([{ value: 'hello' }]);
  });

  it('reports connected true via the callback once the connection opens', () => {
    const service = setup();
    const connectionStateCallback = vi.fn();
    service.listen('/sse/dashboard', connectionStateCallback).subscribe();

    FakeEventSource.latest().onopen!();

    expect(connectionStateCallback).toHaveBeenCalledWith(true);
  });

  it('reconnects with a new EventSource after the connection is permanently closed', () => {
    const service = setup();
    const connectionStateCallback = vi.fn();
    service.listen('/sse/dashboard', connectionStateCallback).subscribe();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CLOSED;
    firstInstance.onerror!({} as Event);

    expect(connectionStateCallback).toHaveBeenCalledWith(false);
    expect(FakeEventSource.instances).toHaveLength(1);

    vi.advanceTimersByTime(1000);

    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.latest()).not.toBe(firstInstance);
  });

  // Routine SSE lifecycle (idle proxy timeout, screen off, a blip) must not be captured as a client
  // error and reported to the backend - only a console.warn/error is captured, so the first drop of
  // a streak has to log below that. See #3617.
  it('logs the first reconnect of a streak below the captured console levels', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = setup();
    service.listen('/sse/dashboard').subscribe();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CLOSED;
    firstInstance.onerror!({} as Event);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('escalates to a captured console.error once reconnecting keeps failing without a successful reopen', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = setup();
    service.listen('/sse/dashboard').subscribe();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CLOSED;
    firstInstance.onerror!({} as Event);
    vi.advanceTimersByTime(1000);

    const secondInstance = FakeEventSource.latest();
    secondInstance.readyState = FakeEventSource.CLOSED;
    secondInstance.onerror!({} as Event);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('resets the failure streak after a successful reopen, so the next drop logs below the captured levels again', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = setup();
    service.listen('/sse/dashboard').subscribe();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CLOSED;
    firstInstance.onerror!({} as Event);
    vi.advanceTimersByTime(1000);

    FakeEventSource.latest().readyState = FakeEventSource.OPEN;
    FakeEventSource.latest().onopen!();

    logSpy.mockClear();
    errorSpy.mockClear();

    FakeEventSource.latest().readyState = FakeEventSource.CLOSED;
    FakeEventSource.latest().onerror!({} as Event);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  // A network-level failure never reaching CLOSED must escalate to a captured console.error only
  // once the grace period proves the drop is persistent, not on every onerror the browser fires
  // while retrying on its own.
  it('logs a captured console.error only after the CONNECTING grace period elapses without recovering', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = setup();
    service.listen('/sse/dashboard').subscribe();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CONNECTING;
    firstInstance.onerror!({} as Event);

    vi.advanceTimersByTime(4999);
    expect(errorSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('does not open a replacement EventSource on a transient error while the browser is still retrying (readyState CONNECTING)', () => {
    const service = setup();
    const connectionStateCallback = vi.fn();
    service.listen('/sse/dashboard', connectionStateCallback).subscribe();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CONNECTING;
    firstInstance.onerror!({} as Event);

    // The native EventSource retries CONNECTING on its own - this service must never open a second
    // one alongside it, whatever it reports on connectionStateCallback.
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  // A network-level failure never reaches CLOSED - the browser's own EventSource keeps retrying in
  // CONNECTING indefinitely - so nothing would otherwise ever report the drop and the "Live-
  // Verbindung" badge would stay green while no data arrives. See #3530.
  it('reports disconnected after a grace period when a CONNECTING error never resolves', () => {
    const service = setup();
    const connectionStateCallback = vi.fn();
    service.listen('/sse/dashboard', connectionStateCallback).subscribe();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CONNECTING;
    firstInstance.onerror!({} as Event);

    vi.advanceTimersByTime(4999);
    expect(connectionStateCallback).not.toHaveBeenCalledWith(false);

    vi.advanceTimersByTime(1);
    expect(connectionStateCallback).toHaveBeenCalledWith(false);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('does not report disconnected when the browser reconnects on its own within the grace period', () => {
    const service = setup();
    const connectionStateCallback = vi.fn();
    service.listen('/sse/dashboard', connectionStateCallback).subscribe();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CONNECTING;
    firstInstance.onerror!({} as Event);

    vi.advanceTimersByTime(2000);
    firstInstance.readyState = FakeEventSource.OPEN;
    firstInstance.onopen!();

    vi.advanceTimersByTime(5000);

    expect(connectionStateCallback).not.toHaveBeenCalledWith(false);
  });

  it('does not fire a stale grace-period disconnect after the connection permanently closed and reconnected', () => {
    const service = setup();
    const connectionStateCallback = vi.fn();
    service.listen('/sse/dashboard', connectionStateCallback).subscribe();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CONNECTING;
    firstInstance.onerror!({} as Event);

    // A second, unrelated error now closes the connection for good before the grace period from
    // the first error elapses - the grace timer from the CONNECTING branch must not still fire
    // callback(false) a second time once the reconnect below succeeds.
    firstInstance.readyState = FakeEventSource.CLOSED;
    firstInstance.onerror!({} as Event);
    vi.advanceTimersByTime(1000);

    FakeEventSource.latest().onopen!();
    connectionStateCallback.mockClear();

    vi.advanceTimersByTime(5000);

    expect(connectionStateCallback).not.toHaveBeenCalledWith(false);
  });

  it('backs off exponentially up to 30s while reconnecting keeps failing', () => {
    const service = setup();
    service.listen('/sse/dashboard').subscribe();

    const failCurrentConnection = () => {
      const instance = FakeEventSource.latest();
      instance.readyState = FakeEventSource.CLOSED;
      instance.onerror!({} as Event);
    };

    // 1s, then 2s, 4s, 8s, 16s and from there capped at 30s - each step must not fire a moment
    // early, so every delay is checked just below and then at its expected value.
    const expectedDelays = [1000, 2000, 4000, 8000, 16000, 30000, 30000];

    expectedDelays.forEach((delay, index) => {
      failCurrentConnection();

      vi.advanceTimersByTime(delay - 1);
      expect(FakeEventSource.instances).toHaveLength(index + 1);

      vi.advanceTimersByTime(1);
      expect(FakeEventSource.instances).toHaveLength(index + 2);
    });
  });

  it('restarts the backoff after a connection opens again', () => {
    const service = setup();
    service.listen('/sse/dashboard').subscribe();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CLOSED;
    firstInstance.onerror!({} as Event);
    vi.advanceTimersByTime(1000);

    const secondInstance = FakeEventSource.latest();
    secondInstance.readyState = FakeEventSource.CLOSED;
    secondInstance.onerror!({} as Event);
    vi.advanceTimersByTime(2000);

    // A successful open means the next drop is a fresh incident, not a continuation of the last.
    FakeEventSource.latest().onopen!();

    const thirdInstance = FakeEventSource.latest();
    thirdInstance.readyState = FakeEventSource.CLOSED;
    thirdInstance.onerror!({} as Event);

    vi.advanceTimersByTime(1000);

    expect(FakeEventSource.instances).toHaveLength(4);
  });

  it('opens only one replacement even when onerror fires repeatedly for the same dead connection', () => {
    const service = setup();
    service.listen('/sse/dashboard').subscribe();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CLOSED;
    firstInstance.onerror!({} as Event);
    firstInstance.onerror!({} as Event);
    firstInstance.onerror!({} as Event);

    vi.advanceTimersByTime(1000);

    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it('closes the EventSource and stops a pending reconnect on unsubscribe', () => {
    const service = setup();
    const subscription = service.listen('/sse/dashboard').subscribe();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CLOSED;
    firstInstance.onerror!({} as Event);

    subscription.unsubscribe();
    vi.advanceTimersByTime(5000);

    expect(FakeEventSource.instances).toHaveLength(1);
  });
});
