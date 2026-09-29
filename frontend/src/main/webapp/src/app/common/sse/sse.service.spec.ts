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
  readonly listeners = new Map<string, (event: MessageEvent) => void>();
  readonly addEventListener = vi.fn((name: string, listener: (event: MessageEvent) => void) => {
    this.listeners.set(name, listener);
  });

  emit(name: string, data: string) {
    this.listeners.get(name)?.({ data, type: name } as MessageEvent);
  }

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

  it('opens one EventSource for the subscribed topics and emits their parsed messages', async () => {
    const service = setup();
    const received: unknown[] = [];
    service.topic<{ value: string }>('dashboard').subscribe((data) => received.push(data));
    await Promise.resolve();

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.latest().url).toBe(`${BASE_URL}/api/sse/events?topics=dashboard`);

    FakeEventSource.latest().emit('dashboard', JSON.stringify({ value: 'hello' }));

    expect(received).toEqual([{ value: 'hello' }]);
  });

  it('serves several topics from one connection, sorted, and routes each event to its topic', async () => {
    const service = setup();
    const distributions: unknown[] = [];
    const configs: unknown[] = [];
    service.topic('distribution').subscribe((data) => distributions.push(data));
    service.topic('config').subscribe((data) => configs.push(data));
    await Promise.resolve();

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.latest().url).toBe(`${BASE_URL}/api/sse/events?topics=config,distribution`);

    FakeEventSource.latest().emit('config', JSON.stringify({ a: 1 }));

    expect(configs).toEqual([{ a: 1 }]);
    expect(distributions).toEqual([]);
  });

  it('gives every subscriber of one topic the message', async () => {
    const service = setup();
    const first: unknown[] = [];
    const second: unknown[] = [];
    service.topic('config').subscribe((data) => first.push(data));
    service.topic('config').subscribe((data) => second.push(data));
    await Promise.resolve();

    FakeEventSource.latest().emit('config', JSON.stringify({ a: 1 }));

    expect(first).toEqual([{ a: 1 }]);
    expect(second).toEqual([{ a: 1 }]);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('adds the argument of a topic to the request', async () => {
    const service = setup();
    service.topic('scanner-results', { argument: 5 }).subscribe();
    await Promise.resolve();

    expect(FakeEventSource.latest().url).toBe(`${BASE_URL}/api/sse/events?topics=scanner-results%3A5`);
  });

  it('replaces the connection when the set of topics changes, and closes it when none is left', async () => {
    const service = setup();
    const distribution = service.topic('distribution').subscribe();
    await Promise.resolve();
    const first = FakeEventSource.latest();

    const dashboard = service.topic('dashboard').subscribe();
    await Promise.resolve();

    expect(first.close).toHaveBeenCalled();
    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.latest().url).toBe(`${BASE_URL}/api/sse/events?topics=dashboard,distribution`);

    dashboard.unsubscribe();
    await Promise.resolve();
    expect(FakeEventSource.instances).toHaveLength(3);
    expect(FakeEventSource.latest().url).toBe(`${BASE_URL}/api/sse/events?topics=distribution`);

    distribution.unsubscribe();
    await Promise.resolve();
    expect(FakeEventSource.latest().close).toHaveBeenCalled();
    expect(FakeEventSource.instances).toHaveLength(3);
  });

  it('opens one connection for subscriptions made in the same tick', async () => {
    const service = setup();
    service.topic('distribution').subscribe();
    service.topic('config').subscribe();
    service.topic('notifications').subscribe();
    await Promise.resolve();

    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('does not reconnect when a subscription changes nothing about the set', async () => {
    const service = setup();
    service.topic('config').subscribe();
    await Promise.resolve();

    const second = service.topic('config').subscribe();
    await Promise.resolve();
    second.unsubscribe();
    await Promise.resolve();

    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('tells a subscriber that joins an open connection that it is connected', async () => {
    const service = setup();
    service.topic('distribution').subscribe();
    await Promise.resolve();
    FakeEventSource.latest().onopen!();

    const connectionStateCallback = vi.fn();
    service.topic('config', { connectionStateCallback }).subscribe();

    expect(connectionStateCallback).toHaveBeenCalledWith(true);
  });

  it('does not log the body of a message it cannot parse', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = setup();
    service.topic('config').subscribe();
    await Promise.resolve();

    FakeEventSource.latest().emit('config', 'not json {secret}');

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(errorSpy.mock.calls[0])).not.toContain('secret');
  });

  it('reports connected true via the callback once the connection opens', async () => {
    const service = setup();
    const connectionStateCallback = vi.fn();
    service.topic('dashboard', { connectionStateCallback }).subscribe();
    await Promise.resolve();

    FakeEventSource.latest().onopen!();

    expect(connectionStateCallback).toHaveBeenCalledWith(true);
  });

  it('reconnects with a new EventSource after the connection is permanently closed', async () => {
    const service = setup();
    const connectionStateCallback = vi.fn();
    service.topic('dashboard', { connectionStateCallback }).subscribe();
    await Promise.resolve();

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
  it('logs the first reconnect of a streak below the captured console levels', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = setup();
    service.topic('dashboard').subscribe();
    await Promise.resolve();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CLOSED;
    firstInstance.onerror!({} as Event);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('escalates to a captured console.error once reconnecting keeps failing without a successful reopen', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = setup();
    service.topic('dashboard').subscribe();
    await Promise.resolve();

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

  it('resets the failure streak after a successful reopen, so the next drop logs below the captured levels again', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = setup();
    service.topic('dashboard').subscribe();
    await Promise.resolve();

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
  it('logs a captured console.error only after the CONNECTING grace period elapses without recovering', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = setup();
    service.topic('dashboard').subscribe();
    await Promise.resolve();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CONNECTING;
    firstInstance.onerror!({} as Event);

    vi.advanceTimersByTime(4999);
    expect(errorSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('opens no replacement EventSource on a transient error while the browser is still retrying (CONNECTING)', async () => {
    const service = setup();
    const connectionStateCallback = vi.fn();
    service.topic('dashboard', { connectionStateCallback }).subscribe();
    await Promise.resolve();

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
  it('reports disconnected after a grace period when a CONNECTING error never resolves', async () => {
    const service = setup();
    const connectionStateCallback = vi.fn();
    service.topic('dashboard', { connectionStateCallback }).subscribe();
    await Promise.resolve();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CONNECTING;
    firstInstance.onerror!({} as Event);

    vi.advanceTimersByTime(4999);
    expect(connectionStateCallback).not.toHaveBeenCalledWith(false);

    vi.advanceTimersByTime(1);
    expect(connectionStateCallback).toHaveBeenCalledWith(false);
    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it('does not report disconnected when the browser reconnects on its own within the grace period', async () => {
    const service = setup();
    const connectionStateCallback = vi.fn();
    service.topic('dashboard', { connectionStateCallback }).subscribe();
    await Promise.resolve();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CONNECTING;
    firstInstance.onerror!({} as Event);

    vi.advanceTimersByTime(2000);
    firstInstance.readyState = FakeEventSource.OPEN;
    firstInstance.onopen!();

    vi.advanceTimersByTime(5000);

    expect(connectionStateCallback).not.toHaveBeenCalledWith(false);
  });

  it('does not fire a stale grace-period disconnect after the connection permanently closed and reconnected', async () => {
    const service = setup();
    const connectionStateCallback = vi.fn();
    service.topic('dashboard', { connectionStateCallback }).subscribe();
    await Promise.resolve();

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

  it('backs off exponentially up to 30s while reconnecting keeps failing', async () => {
    const service = setup();
    service.topic('dashboard').subscribe();
    await Promise.resolve();

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

  it('restarts the backoff after a connection opens again', async () => {
    const service = setup();
    service.topic('dashboard').subscribe();
    await Promise.resolve();

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

  it('opens only one replacement even when onerror fires repeatedly for the same dead connection', async () => {
    const service = setup();
    service.topic('dashboard').subscribe();
    await Promise.resolve();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CLOSED;
    firstInstance.onerror!({} as Event);
    firstInstance.onerror!({} as Event);
    firstInstance.onerror!({} as Event);

    vi.advanceTimersByTime(1000);

    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it('closes the EventSource and stops a pending reconnect on unsubscribe', async () => {
    const service = setup();
    const subscription = service.topic('dashboard').subscribe();
    await Promise.resolve();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CLOSED;
    firstInstance.onerror!({} as Event);

    subscription.unsubscribe();
    vi.advanceTimersByTime(5000);

    expect(FakeEventSource.instances).toHaveLength(1);
  });
});
