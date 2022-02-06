import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthenticationService } from '../security/authentication.service';

import { AuthenticationInterceptor } from './authentication-interceptor.service';

describe('AuthenticationInterceptor', () => {
  let client: HttpClient
  let httpMock: HttpTestingController
  let authServiceSpy: jasmine.SpyObj<AuthenticationService>

  beforeEach(() => {
    const spy = jasmine.createSpyObj('AuthenticationService', ['isAuthenticated', 'getToken']);

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
          useValue: spy
        }
      ],
    });

    client = TestBed.inject(HttpClient)
    httpMock = TestBed.inject(HttpTestingController);
    authServiceSpy = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
  });

  it('not authenticated - called without authorization header', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false)

    client.get('/test').subscribe()

    let req = httpMock.expectOne('/test')
    expect(req.request.headers.get('Authorization')).toBeNull
  });

  it('authenticated - called with authorization header', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true)
    authServiceSpy.getToken.and.returnValue("TOKENVALUE")

    client.get('/test').subscribe()

    let req = httpMock.expectOne('/test')
    expect(req.request.headers.get('Authorization')).toEqual('Bearer TOKENVALUE')
  });

});
