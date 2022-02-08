import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { AuthenticationService } from '../security/authentication.service';

import { AuthenticationInterceptor } from './authentication-interceptor.service';

describe('AuthenticationInterceptor', () => {
  let client: HttpClient
  let httpMock: HttpTestingController
  let authServiceSpy: jasmine.SpyObj<AuthenticationService>

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthenticationInterceptor,
        {
          provide: HTTP_INTERCEPTORS,
          useClass: AuthenticationInterceptor,
          multi: true
        },
        {
          provide: AuthenticationService,
          useValue: jasmine.createSpyObj('AuthenticationService', ['getToken', 'logoutAndRedirectExpired'])
        }
      ],
    });

    client = TestBed.inject(HttpClient)
    httpMock = TestBed.inject(HttpTestingController);
    authServiceSpy = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
  });

  it('not authenticated - called without authorization header', () => {
    authServiceSpy.getToken.and.returnValue(null)

    client.get('/test').subscribe()

    let req = httpMock.expectOne('/test')
    expect(req.request.headers.get('Authorization')).toBeNull()
  });

  it('authenticated - called with authorization header', () => {
    authServiceSpy.getToken.and.returnValue('TOKENVALUE')

    client.get('/test').subscribe()

    let req = httpMock.expectOne('/test')
    expect(req.request.headers.get('Authorization')).toBe('Bearer TOKENVALUE')
  });

  it('authenticated - called with expired authorization header', () => {
    authServiceSpy.getToken.and.returnValue('TOKENVALUE-EXPIRED')

    client.get('/test').subscribe(() => { }, err => {
      expect(authServiceSpy.logoutAndRedirectExpired).toHaveBeenCalled()
    })

    let mockReq = httpMock.expectOne('/test')
    const mockErrorResponse = { status: 401, statusText: 'Unauthorized' };
    mockReq.flush(null, mockErrorResponse)
  });

});
