import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {Subject} from 'rxjs';
import {AppConfig, ConfigApiService, PublicAppConfig} from './config-api.service';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {SseService} from '../common/sse/sse.service';

describe('ConfigApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: ConfigApiService;
  let configChanges: Subject<AppConfig>;

  const testConfig: AppConfig = {version: '1.2.3', buildTime: '2026-07-28T15:30:00Z', scannerFolderEnabled: true, passwordRules: {minLength: 8, maxLength: 50, descriptions: []}};
  const testPublicConfig: PublicAppConfig = {environmentLabel: 'DEV'};

  beforeEach(() => {
    configChanges = new Subject<AppConfig>();
    const sseServiceSpy = {
      listen: vi.fn().mockName('SseService.listen').mockReturnValue(configChanges.asObservable())
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: SseService, useValue: sseServiceSpy},
        ConfigApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(ConfigApiService);
  });

  it('fetch config', () => {
    const received: (AppConfig | null)[] = [];
    apiService.observeConfig().subscribe((data) => received.push(data));

    const req = httpMock.expectOne({method: 'GET', url: '/config'});
    req.flush(testConfig);
    httpMock.verify();

    expect(received).toEqual([testConfig]);
  });

  it('falls back to null when the request fails', () => {
    const received: (AppConfig | null)[] = [];
    apiService.observeConfig().subscribe((data) => received.push(data));

    const req = httpMock.expectOne({method: 'GET', url: '/config'});
    req.flush('error', {status: 500, statusText: 'Internal Server Error'});
    httpMock.verify();

    expect(received).toEqual([null]);
  });

  it('re-emits the config when the backend pushes a change', () => {
    const received: (AppConfig | null)[] = [];
    apiService.observeConfig().subscribe((data) => received.push(data));
    httpMock.expectOne({method: 'GET', url: '/config'}).flush(testConfig);

    const changedConfig = {...testConfig, scannerFolderEnabled: false};
    configChanges.next(changedConfig);

    expect(received).toEqual([testConfig, changedConfig]);
    expect(TestBed.inject(SseService).listen).toHaveBeenCalledWith('/sse/config');
  });

  // One HTTP request and one SSE connection for the whole app, not one per component reading it.
  it('shares one request and one subscription between callers', () => {
    const first: (AppConfig | null)[] = [];
    const second: (AppConfig | null)[] = [];
    apiService.observeConfig().subscribe((data) => first.push(data));
    httpMock.expectOne({method: 'GET', url: '/config'}).flush(testConfig);

    apiService.observeConfig().subscribe((data) => second.push(data));
    httpMock.verify();

    // The late subscriber starts from the value already known rather than fetching it again.
    expect(second).toEqual([testConfig]);
    expect(TestBed.inject(SseService).listen).toHaveBeenCalledTimes(1);
  });

  it('fetch public config', () => {
    apiService.getPublicConfig().subscribe((data: PublicAppConfig | null) => {
      expect(data).toEqual(testPublicConfig);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/config/public'});
    req.flush(testPublicConfig);
    httpMock.verify();
  });

  it('falls back to null when the public config request fails', () => {
    apiService.getPublicConfig().subscribe((data: PublicAppConfig | null) => {
      expect(data).toBeNull();
    });

    const req = httpMock.expectOne({method: 'GET', url: '/config/public'});
    req.flush('error', {status: 500, statusText: 'Internal Server Error'});
    httpMock.verify();
  });

});
