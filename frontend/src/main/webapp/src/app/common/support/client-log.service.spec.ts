import {TestBed} from '@angular/core/testing';
import {ClientLogService} from './client-log.service';

describe('ClientLogService', () => {
  let service: ClientLogService;
  let listeners: Record<string, (event: Event) => void>;

  // The listeners are captured and called directly rather than dispatched on the real window:
  // dispatching an error there would also reach the test runner's own uncaught-error catcher.
  beforeEach(() => {
    listeners = {};
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      listeners[type] = listener as (event: Event) => void;
    });

    TestBed.configureTestingModule({providers: [ClientLogService]});
    service = TestBed.inject(ClientLogService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts empty', () => {
    expect(service.getEntries()).toEqual([]);
  });

  // local time, not UTC: the mail states the report's own time in the reporter's time zone, and the
  // two are read against each other
  it('records a message with a timestamp on the reporter\'s clock', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 22, 9, 15, 30));

    service.record('HTTP 500 - GET /api/households');

    expect(service.getEntries()).toEqual([
      {timestamp: '22.03.2026 09:15:30', message: 'HTTP 500 - GET /api/households'}
    ]);

    vi.useRealTimers();
  });

  it('keeps only the 20 most recent entries', () => {
    for (let i = 1; i <= 25; i++) {
      service.record(`error ${i}`);
    }

    const entries = service.getEntries();
    expect(entries).toHaveLength(20);
    expect(entries[0].message).toBe('error 6');
    expect(entries[19].message).toBe('error 25');
  });

  it('truncates an oversized message so the request stays acceptable to the backend', () => {
    service.record('x'.repeat(1500));

    expect(service.getEntries()[0].message).toHaveLength(1000);
  });

  it('records an uncaught error that never reaches angular', () => {
    service.captureGlobalErrors();

    listeners['error']({
      target: window,
      message: 'Uncaught TypeError',
      error: new TypeError('x is not a function')
    } as unknown as Event);

    expect(service.getEntries().map(entry => entry.message))
      .toEqual(['TypeError: x is not a function']);
  });

  it('records an uncaught error that was not thrown as an Error', () => {
    service.captureGlobalErrors();

    listeners['error']({target: window, message: 'Script error.'} as unknown as Event);

    expect(service.getEntries().map(entry => entry.message)).toEqual(['Script error.']);
  });

  it('records an unhandled promise rejection', () => {
    service.captureGlobalErrors();

    listeners['unhandledrejection']({reason: new Error('backend nicht erreichbar')} as unknown as Event);

    expect(service.getEntries().map(entry => entry.message))
      .toEqual(['Unbehandelter Promise-Fehler: Error: backend nicht erreichbar']);
  });

  it('records a resource that failed to load', () => {
    service.captureGlobalErrors();
    const image = document.createElement('img');
    image.src = 'http://localhost/assets/logo.png';

    listeners['error']({target: image} as unknown as Event);

    expect(service.getEntries().map(entry => entry.message))
      .toEqual(['Ressource nicht geladen: img http://localhost/assets/logo.png']);
  });

  it('hands out a copy so a caller cannot change the log', () => {
    service.record('error');

    service.getEntries().push({timestamp: 'now', message: 'injected'});

    expect(service.getEntries()).toHaveLength(1);
  });

});
