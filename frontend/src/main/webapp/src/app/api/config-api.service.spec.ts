import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {AppConfig, ConfigApiService} from './config-api.service';
import {provideHttpClient, withXhr} from '@angular/common/http';

describe('ConfigApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: ConfigApiService;

  const testConfig: AppConfig = {version: '1.2.3', buildTime: '2026-07-28T15:30:00Z', scannerFolderEnabled: true};

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

});
