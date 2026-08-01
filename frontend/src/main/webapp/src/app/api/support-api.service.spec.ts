import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {SupportApiService} from './support-api.service';

describe('SupportApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: SupportApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        SupportApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(SupportApiService);
  });

  it('create support request', () => {
    apiService.createSupportRequest('Something is broken').subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/support'});
    req.flush(null);
    httpMock.verify();

    expect(req.request.body).toEqual({text: 'Something is broken'});
  });

});
