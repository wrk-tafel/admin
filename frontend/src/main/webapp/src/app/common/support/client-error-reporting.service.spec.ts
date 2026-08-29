import {TestBed} from '@angular/core/testing';
import {of, throwError} from 'rxjs';
import {ClientLogService} from './client-log.service';
import {ClientErrorReportingService} from './client-error-reporting.service';
import {ClientErrorApiService} from '../../api/client-error-api.service';

describe('ClientErrorReportingService', () => {
  let service: ClientErrorReportingService;
  let clientLogService: ClientLogService;
  let apiServiceSpy: {reportClientError: ReturnType<typeof vi.fn>};

  const windowMock = {
    location: {origin: 'http://localhost', pathname: '/uebersicht'},
    navigator: {userAgent: 'Mozilla/5.0'}
  } as unknown as Window;

  beforeEach(() => {
    apiServiceSpy = {reportClientError: vi.fn().mockReturnValue(of(undefined))};

    TestBed.configureTestingModule({
      providers: [
        ClientLogService,
        ClientErrorReportingService,
        {provide: ClientErrorApiService, useValue: apiServiceSpy},
        {provide: Window, useValue: windowMock}
      ]
    });
    service = TestBed.inject(ClientErrorReportingService);
    clientLogService = TestBed.inject(ClientLogService);
  });

  it('reports a recorded error with the current page and user agent', () => {
    service.init();

    clientLogService.record('TypeError: boom');

    expect(apiServiceSpy.reportClientError).toHaveBeenCalledWith('TypeError: boom', 'http://localhost/uebersicht', 'Mozilla/5.0');
  });

  it('does not report anything before init is called', () => {
    clientLogService.record('TypeError: boom');

    expect(apiServiceSpy.reportClientError).not.toHaveBeenCalled();
  });

  it('reports an identical message only once per session', () => {
    service.init();

    clientLogService.record('TypeError: boom');
    clientLogService.record('TypeError: boom');

    expect(apiServiceSpy.reportClientError).toHaveBeenCalledTimes(1);
  });

  it('stops reporting once the per-session cap is reached', () => {
    service.init();

    for (let i = 1; i <= 25; i++) {
      clientLogService.record(`error ${i}`);
    }

    expect(apiServiceSpy.reportClientError).toHaveBeenCalledTimes(20);
  });

  it('does not throw when the report itself fails', () => {
    apiServiceSpy.reportClientError.mockReturnValue(throwError(() => new Error('network error')));
    service.init();

    expect(() => clientLogService.record('TypeError: boom')).not.toThrow();
  });

});
