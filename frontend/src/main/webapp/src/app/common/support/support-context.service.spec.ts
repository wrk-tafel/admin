import {TestBed} from '@angular/core/testing';
import {ClientLogService} from './client-log.service';
import {SupportContextService} from './support-context.service';

describe('SupportContextService', () => {
  let service: SupportContextService;
  let clientLogService: ClientLogService;

  const windowMock = {
    location: {href: 'http://localhost/kunden/suchen'},
    navigator: {userAgent: 'Mozilla/5.0', language: 'de-AT'},
    innerWidth: 1280,
    innerHeight: 800,
    screen: {width: 1920, height: 1080}
  } as unknown as Window;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ClientLogService,
        SupportContextService,
        {provide: Window, useValue: windowMock}
      ]
    });
    service = TestBed.inject(SupportContextService);
    clientLogService = TestBed.inject(ClientLogService);
  });

  it('collects the page, the browser and the recent errors', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 22, 9, 15, 30));
    clientLogService.record('HTTP 500 - GET /api/households');
    vi.useRealTimers();

    const context = service.collect('data:image/jpeg;base64,AAAA');

    expect(context).toEqual({
      screenshot: 'data:image/jpeg;base64,AAAA',
      page: 'http://localhost/kunden/suchen',
      userAgent: 'Mozilla/5.0',
      viewport: '1280x800',
      screen: '1920x1080',
      language: 'de-AT',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      recentErrors: [{timestamp: '22.03.2026 09:15:30', message: 'HTTP 500 - GET /api/households'}]
    });
  });

  it('collects an empty error list when nothing went wrong', () => {
    expect(service.collect().recentErrors).toEqual([]);
  });

  it('carries no screenshot when none was taken or the reporter left it out', () => {
    expect(service.collect().screenshot).toBeNull();
  });

});
