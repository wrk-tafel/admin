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

  it('does not reconnect on a transient error while the browser is still retrying (readyState CONNECTING)', () => {
    const service = setup();
    const connectionStateCallback = vi.fn();
    service.listen('/sse/dashboard', connectionStateCallback).subscribe();

    const firstInstance = FakeEventSource.latest();
    firstInstance.readyState = FakeEventSource.CONNECTING;
    firstInstance.onerror!({} as Event);

    vi.advanceTimersByTime(5000);

    expect(connectionStateCallback).not.toHaveBeenCalledWith(false);
    expect(FakeEventSource.instances).toHaveLength(1);
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
