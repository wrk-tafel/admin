import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {UserApiService} from './user-api.service';
import {provideHttpClient} from '@angular/common/http';
import {ScannerApiService} from './scanner-api.service';

describe('ScannerApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: ScannerApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        UserApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(ScannerApiService);
  });

  it('register scanner with existing id', () => {
    const existingScannerId = 123;
    apiService.registerScanner(existingScannerId).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: `/scanners/register?scannerId=${existingScannerId}`});
    req.flush(null);
    httpMock.verify();
  });

  it('register scanner without existing id', () => {
    apiService.registerScanner().subscribe();

    const req = httpMock.expectOne({method: 'POST', url: `/scanners/register`});
    req.flush(null);
    httpMock.verify();
  });

  it('get scanners', () => {
    apiService.getScanners().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: `/scanners`});
    req.flush(null);
    httpMock.verify();
  });

  it('send scan result', () => {
    const scannerId = 123;
    const scanResult = 456;
    apiService.sendScanResult(scannerId, scanResult).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: `/scanners/${scannerId}/results?scanResult=${scanResult}`});
    req.flush(null);
    httpMock.verify();
  });

});
