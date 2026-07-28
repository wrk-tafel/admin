import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {ReportingApiService} from './reporting-api.service';

describe('ReportingApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: ReportingApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting()
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(ReportingApiService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('generate school starter package csv', () => {
    apiService.generateSchoolStarterPackageCsv().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/reporting/school-starter-package/generate-csv'});
    req.flush(null);
    httpMock.verify();
  });

});
