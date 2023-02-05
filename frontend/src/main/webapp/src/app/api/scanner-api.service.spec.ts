import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {ScannerApiService} from './scanner-api.service';

describe('ScannerApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: ScannerApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ReactiveFormsModule],
      providers: [ScannerApiService]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(ScannerApiService);
  });

  it('get scanner ids', () => {
    apiService.getScannerIds().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/scanners'});
    req.flush(null);
    httpMock.verify();
  });

});
