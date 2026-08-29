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
    // captureGlobalErrors wraps console.warn/console.error in place - spying on them first means
    // vi.restoreAllMocks() below undoes that wrap again after every test, not just this one.
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

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

  it('records a console.warn call and still prints it', () => {
    service.captureGlobalErrors();

    console.warn('SSE-Verbindung dauerhaft geschlossen, versuche erneut zu verbinden...');

    expect(service.getEntries().map(entry => entry.message))
      .toEqual(['SSE-Verbindung dauerhaft geschlossen, versuche erneut zu verbinden...']);
    expect(console.warn).toHaveBeenCalledWith('SSE-Verbindung dauerhaft geschlossen, versuche erneut zu verbinden...');
  });

  it('records a console.warn call with several arguments, an Error among them', () => {
    service.captureGlobalErrors();

    console.warn('Konnte Kamera nicht starten', new Error('permission denied'));

    expect(service.getEntries().map(entry => entry.message))
      .toEqual(['Konnte Kamera nicht starten Error: permission denied']);
  });

  it('records a raw console.error call and still prints it', () => {
    service.captureGlobalErrors();

    console.error('some raw console.error call');

    expect(service.getEntries().map(entry => entry.message)).toEqual(['some raw console.error call']);
    expect(console.error).toHaveBeenCalledWith('some raw console.error call');
  });

  it('does not record console.warn/console.error while runWithConsoleCaptureSuppressed runs', () => {
    service.captureGlobalErrors();

    service.runWithConsoleCaptureSuppressed(() => {
      console.warn('suppressed warning');
      console.error('suppressed error');
    });

    expect(service.getEntries()).toEqual([]);
  });

  it('resumes recording console.warn/console.error once runWithConsoleCaptureSuppressed returns', () => {
    service.captureGlobalErrors();

    service.runWithConsoleCaptureSuppressed(() => { /* nothing to suppress here */ });
    console.error('recorded again');

    expect(service.getEntries().map(entry => entry.message)).toEqual(['recorded again']);
  });

  it('resumes recording even when the suppressed function throws', () => {
    service.captureGlobalErrors();

    expect(() => service.runWithConsoleCaptureSuppressed(() => {
      throw new Error('boom');
    })).toThrow('boom');

    console.error('recorded after the throw');

    expect(service.getEntries().map(entry => entry.message)).toEqual(['recorded after the throw']);
  });

  it('emits every recorded entry on onRecord', () => {
    const emitted: string[] = [];
    service.onRecord.subscribe(entry => emitted.push(entry.message));

    service.record('first error');
    service.record('second error');

    expect(emitted).toEqual(['first error', 'second error']);
  });

  it('hands out a copy so a caller cannot change the log', () => {
    service.record('error');

    service.getEntries().push({timestamp: 'now', message: 'injected'});

    expect(service.getEntries()).toHaveLength(1);
  });

});
