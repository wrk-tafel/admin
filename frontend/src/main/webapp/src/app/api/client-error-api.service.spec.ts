import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {ClientErrorApiService} from './client-error-api.service';

describe('ClientErrorApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: ClientErrorApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        ClientErrorApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(ClientErrorApiService);
  });

  it('reports a client error with page and userAgent', () => {
    apiService.reportClientError('TypeError: boom', 'http://localhost/uebersicht', 'Mozilla/5.0').subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/client-errors'});
    req.flush(null);
    httpMock.verify();

    expect(req.request.body).toEqual({message: 'TypeError: boom', page: 'http://localhost/uebersicht', userAgent: 'Mozilla/5.0'});
  });

  it('reports a client error without page or userAgent', () => {
    apiService.reportClientError('TypeError: boom').subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/client-errors'});
    req.flush(null);
    httpMock.verify();

    expect(req.request.body).toEqual({message: 'TypeError: boom', page: undefined, userAgent: undefined});
  });

});
