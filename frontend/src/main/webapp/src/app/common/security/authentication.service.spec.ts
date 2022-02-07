import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';

import { AuthenticationService } from './authentication.service';

describe('AuthenticationService', () => {
  const LOCAL_STORAGE_TOKEN_KEY: string = "JWT_TOKEN"

  let client: HttpClient
  let httpMock: HttpTestingController

  let jwtHelper: jasmine.SpyObj<JwtHelperService>
  let router: jasmine.SpyObj<Router>
  let service: AuthenticationService

  beforeEach(() => {
    const jwtHelperSpy = jasmine.createSpyObj('JwtHelperService', ['TODO']);
    const routerSpy = jasmine.createSpyObj('Router', ['TODO']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthenticationService,
        {
          provide: JwtHelperService,
          useValue: jwtHelperSpy
        },
        {
          provide: Router,
          useValue: routerSpy
        }
      ],
    });

    client = TestBed.inject(HttpClient)
    httpMock = TestBed.inject(HttpTestingController);

    jwtHelper = TestBed.inject(JwtHelperService) as jasmine.SpyObj<JwtHelperService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    service = TestBed.inject(AuthenticationService);
  });

  it('login successful', () => {
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY)

    service.login("USER", "PWD").then(response => {
      expect(localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY)).toBe("TOKENVALUE")
      expect(response).toBeTrue()
    })

    let mockReq = httpMock.expectOne('/login')
    expect(mockReq.request.method).toBe('POST')
    expect(mockReq.request.body).toBe('username=USER&password=PWD')

    const mockErrorResponse = { status: 200, statusText: 'OK' };
    const data = { token: 'TOKENVALUE' };
    mockReq.flush(data, mockErrorResponse)
  });

});
