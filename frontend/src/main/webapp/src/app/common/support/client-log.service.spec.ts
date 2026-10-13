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

  function errorWithStack<T extends Error>(error: T, stack: string | undefined): T {
    error.stack = stack;
    return error;
  }

  it('records an uncaught error that never reaches angular', () => {
    service.captureGlobalErrors();

    listeners['error']({
      target: window,
      message: 'Uncaught TypeError',
      error: errorWithStack(new TypeError('x is not a function'), undefined)
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

    listeners['unhandledrejection']({
      reason: errorWithStack(new Error('backend nicht erreichbar'), undefined)
    } as unknown as Event);

    expect(service.getEntries().map(entry => entry.message))
      .toEqual(['Unbehandelter Promise-Fehler: Error: backend nicht erreichbar']);
  });

  // The production build leaves nothing of an Angular error but its code, so the frames are what
  // names the caller (#3831). Chromium and Firefox write them differently.
  it('adds where an unhandled promise rejection was thrown, as Chromium reports it', () => {
    service.captureGlobalErrors();

    listeners['unhandledrejection']({
      reason: errorWithStack(new Error('NG05601'), [
        'Error: NG05601',
        '    at https://tafel.example.org/chunk-ABC123.js:7:4211',
        '    at e.runSync (https://tafel.example.org/main-XYZ789.js:1:932)'
      ].join('\n'))
    } as unknown as Event);

    expect(service.getEntries().map(entry => entry.message))
      .toEqual(['Unbehandelter Promise-Fehler: Error: NG05601 [chunk-ABC123.js:7:4211 < main-XYZ789.js:1:932]']);
  });

  it('adds where an uncaught error was thrown, as Firefox reports it', () => {
    service.captureGlobalErrors();

    listeners['error']({
      target: window,
      message: 'Uncaught Error',
      error: errorWithStack(new Error('NG05601'), [
        'registration/<@https://tafel.example.org/chunk-ABC123.js:7:4211',
        'runSync@https://tafel.example.org/main-XYZ789.js:1:932',
        ''
      ].join('\n'))
    } as unknown as Event);

    expect(service.getEntries().map(entry => entry.message))
      .toEqual(['Error: NG05601 [chunk-ABC123.js:7:4211 < main-XYZ789.js:1:932]']);
  });

  it('names at most the five innermost frames', () => {
    service.captureGlobalErrors();
    const frames = Array.from({length: 8}, (_, i) => `    at https://tafel.example.org/main.js:${i + 1}:1`);

    listeners['unhandledrejection']({
      reason: errorWithStack(new Error('boom'), ['Error: boom', ...frames].join('\n'))
    } as unknown as Event);

    expect(service.getEntries()[0].message)
      .toBe('Unbehandelter Promise-Fehler: Error: boom [main.js:1:1 < main.js:2:1 < main.js:3:1 < main.js:4:1 < main.js:5:1]');
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
    // captured before captureGlobalErrors reassigns console.warn to its own wrapper - the wrapper
    // itself is a plain function, not the spy, so asserting on console.warn after wrapping would
    // fail with "not a spy" even though the original spy was in fact called underneath it.
    const warnSpy = console.warn;
    service.captureGlobalErrors();

    console.warn('SSE-Verbindung dauerhaft geschlossen, versuche erneut zu verbinden...');

    expect(service.getEntries().map(entry => entry.message))
      .toEqual(['SSE-Verbindung dauerhaft geschlossen, versuche erneut zu verbinden...']);
    expect(warnSpy).toHaveBeenCalledWith('SSE-Verbindung dauerhaft geschlossen, versuche erneut zu verbinden...');
  });

  it('records a console.warn call with several arguments, an Error among them', () => {
    service.captureGlobalErrors();

    console.warn('Konnte Kamera nicht starten', new Error('permission denied'));

    expect(service.getEntries().map(entry => entry.message))
      .toEqual(['Konnte Kamera nicht starten Error: permission denied']);
  });

  it('records a raw console.error call and still prints it', () => {
    // same reasoning as the console.warn test above - captured before wrapping.
    const errorSpy = console.error;
    service.captureGlobalErrors();

    console.error('some raw console.error call');

    expect(service.getEntries().map(entry => entry.message)).toEqual(['some raw console.error call']);
    expect(errorSpy).toHaveBeenCalledWith('some raw console.error call');
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
