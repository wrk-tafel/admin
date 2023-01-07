import {HTTP_INTERCEPTORS, HttpClient} from '@angular/common/http';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {AuthenticationService} from '../security/authentication.service';

import {AuthenticationInterceptor} from './authentication-interceptor.service';

describe('AuthenticationInterceptor', () => {
  let client: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthenticationService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthenticationInterceptor,
          multi: true
        },
        {
          provide: AuthenticationService,
          useValue: jasmine.createSpyObj('AuthenticationService', ['getTokenString', 'logoutAndRedirect'])
        }
      ],
    });

    client = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authServiceSpy = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
  });

  it('not authenticated - called without authorization header', () => {
    authServiceSpy.getTokenString.and.returnValue(null);

    client.get('/test').subscribe();

    const req = httpMock.expectOne('/test');
    expect(req.request.headers.get('Authorization')).toBeNull();
  });

  it('authenticated - called with authorization header', () => {
    authServiceSpy.getTokenString.and.returnValue('TOKENVALUE');

    client.get('/test').subscribe();

    const req = httpMock.expectOne('/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer TOKENVALUE');
  });

  it('authenticated - called with expired authorization header', () => {
    authServiceSpy.getTokenString.and.returnValue('TOKENVALUE-EXPIRED');

    client.get('/test').subscribe(() => {
    }, err => {
      expect(authServiceSpy.logoutAndRedirect).toHaveBeenCalled();
    });

    const mockReq = httpMock.expectOne('/test');
    const mockErrorResponse = {status: 401, statusText: 'Unauthorized'};
    mockReq.flush(null, mockErrorResponse);
    httpMock.verify();
  });

  it('authenticated - skips token on calling login', () => {
    authServiceSpy.getTokenString.and.returnValue('TOKENVALUE');

    client.get('/api/login').subscribe();

    const req = httpMock.expectOne('/api/login');
    expect(req.request.headers.get('Authorization')).toBeNull();
  });

});
