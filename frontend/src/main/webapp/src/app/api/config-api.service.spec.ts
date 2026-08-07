import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {AppConfig, ConfigApiService, PublicAppConfig} from './config-api.service';
import {provideHttpClient, withXhr} from '@angular/common/http';

describe('ConfigApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: ConfigApiService;

  const testConfig: AppConfig = {version: '1.2.3', buildTime: '2026-07-28T15:30:00Z', scannerFolderEnabled: true};
  const testPublicConfig: PublicAppConfig = {environmentLabel: 'DEV'};

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        ConfigApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(ConfigApiService);
  });

  it('fetch config', () => {
    apiService.getConfig().subscribe((data: AppConfig | null) => {
      expect(data).toEqual(testConfig);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/config'});
    req.flush(testConfig);
    httpMock.verify();
  });

  it('falls back to null when the request fails', () => {
    apiService.getConfig().subscribe((data: AppConfig | null) => {
      expect(data).toBeNull();
    });

    const req = httpMock.expectOne({method: 'GET', url: '/config'});
    req.flush('error', {status: 500, statusText: 'Internal Server Error'});
    httpMock.verify();
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
