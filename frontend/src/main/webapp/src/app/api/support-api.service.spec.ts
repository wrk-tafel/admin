import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {SupportApiService, SupportClientContext} from './support-api.service';

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
    const clientContext: SupportClientContext = {
      screenshot: 'data:image/jpeg;base64,AAAA',
      page: 'http://localhost/uebersicht',
      userAgent: 'Mozilla/5.0',
      viewport: '1280x800',
      screen: '1920x1080',
      language: 'de-AT',
      timeZone: 'Europe/Vienna',
      recentErrors: [{timestamp: '2026-03-22T09:15:30.000Z', message: 'HTTP 500 - GET /api/households'}]
    };

    apiService.createSupportRequest('Bug in login', 'Something is broken', clientContext).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/support'});
    req.flush(null);
    httpMock.verify();

    expect(req.request.body).toEqual({title: 'Bug in login', text: 'Something is broken', clientContext});
  });

  it('create support request without a client context', () => {
    apiService.createSupportRequest('Bug in login', 'Something is broken').subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/support'});
    req.flush(null);
    httpMock.verify();

    expect(req.request.body).toEqual({title: 'Bug in login', text: 'Something is broken', clientContext: undefined});
  });

});
