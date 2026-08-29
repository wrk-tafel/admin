import {TestBed} from '@angular/core/testing';
import {ClientLogService} from './client-log.service';
import {TafelErrorHandler} from './tafel-error-handler';

describe('TafelErrorHandler', () => {
  let errorHandler: TafelErrorHandler;
  let clientLogService: ClientLogService;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [ClientLogService, TafelErrorHandler]});
    errorHandler = TestBed.inject(TafelErrorHandler);
    clientLogService = TestBed.inject(ClientLogService);

    // Angular's own handler logs to the console - silenced so the spec output stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records an Error with its name and message', () => {
    errorHandler.handleError(new TypeError('cannot read x of undefined'));

    expect(clientLogService.getEntries().map(entry => entry.message))
      .toEqual(['TypeError: cannot read x of undefined']);
  });

  it('records something thrown that is not an Error at all', () => {
    errorHandler.handleError('kaputt');

    expect(clientLogService.getEntries().map(entry => entry.message)).toEqual(['Fehler: kaputt']);
  });

  it('still reports the error the way angular does', () => {
    const error = new Error('boom');

    errorHandler.handleError(error);

    expect(console.error).toHaveBeenCalled();
  });

  // ClientLogService also records a raw console.error call (see its own spec) - Angular's default
  // ErrorHandler logs a handled error via console.error internally, so without suppressing capture
  // around the forwarded call, this would record the same error twice.
  it('does not record the same error twice, once explicitly and once via the forwarded console.error', () => {
    clientLogService.captureGlobalErrors();

    errorHandler.handleError(new Error('boom'));

    expect(clientLogService.getEntries().map(entry => entry.message)).toEqual(['Error: boom']);
  });

});
