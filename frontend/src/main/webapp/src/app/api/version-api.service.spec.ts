import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {VersionApiService, VersionInfo} from './version-api.service';
import {provideHttpClient, withXhr} from '@angular/common/http';

describe('VersionApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: VersionApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        VersionApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(VersionApiService);
  });

  it('fetch version info', () => {
    apiService.getVersion().subscribe((data: VersionInfo | null) => {
      expect(data).toEqual({version: '1.2.3', buildTime: '2026-07-28T15:30:00Z'});
    });

    const req = httpMock.expectOne({method: 'GET', url: '/version'});
    req.flush({version: '1.2.3', buildTime: '2026-07-28T15:30:00Z'});
    httpMock.verify();
  });

  it('falls back to null when the request fails', () => {
    apiService.getVersion().subscribe((data: VersionInfo | null) => {
      expect(data).toBeNull();
    });

    const req = httpMock.expectOne({method: 'GET', url: '/version'});
    req.flush('error', {status: 500, statusText: 'Internal Server Error'});
    httpMock.verify();
  });

});
