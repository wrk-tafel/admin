import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';

import { AuthenticationService } from './authentication.service';

describe('AuthenticationService', () => {
  const LOCAL_STORAGE_TOKEN_KEY = 'JWT_TOKEN';

  let client: HttpClient;
  let httpMock: HttpTestingController;

  let jwtHelper: jasmine.SpyObj<JwtHelperService>;
  let router: jasmine.SpyObj<Router>;
  let service: AuthenticationService;

  beforeEach(() => {
    const jwtHelperSpy = jasmine.createSpyObj('JwtHelperService', ['isTokenExpired', 'decodeToken']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

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

    client = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);

    jwtHelper = TestBed.inject(JwtHelperService) as jasmine.SpyObj<JwtHelperService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    service = TestBed.inject(AuthenticationService);
  });

  it('login successful', () => {
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);

    service.login('USER', 'PWD').then(response => {
      expect(localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY)).toBe('TOKENVALUE');
      expect(response).toBeTrue();
    });

    const mockReq = httpMock.expectOne('/login');
    expect(mockReq.request.method).toBe('POST');
    expect(mockReq.request.body).toBe('username=USER&password=PWD');

    const mockErrorResponse = { status: 200, statusText: 'OK' };
    const data = { token: 'TOKENVALUE' };
    mockReq.flush(data, mockErrorResponse);
  });

  it('login failed', () => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, 'OLDVALUE');

    service.login('USER', 'PWD').then(response => {
      expect(localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY)).toBeNull();
      expect(response).toBeFalse();
    });

    const mockReq = httpMock.expectOne('/login');
    expect(mockReq.request.method).toBe('POST');
    expect(mockReq.request.body).toBe('username=USER&password=PWD');

    const mockErrorResponse = { status: 403, statusText: 'Forbidden' };
    mockReq.flush(null, mockErrorResponse);
  });

  it('logoutAndRedirect', () => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, 'OLDVALUE');

    service.logoutAndRedirect();

    expect(localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['login']);
  });

  it('logoutAndRedirectExpired', () => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, 'OLDVALUE');

    service.logoutAndRedirectExpired();

    expect(localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['login'], { state: { errorType: 'expired' } });
  });

  it('isAuthenticated - token set and valid', () => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, 'TOKENVALUE');
    jwtHelper.isTokenExpired.and.returnValue(false);

    const isAuthenticated = service.isAuthenticated();

    expect(isAuthenticated).toBeTrue();
  });

  it('isAuthenticated - token set but invalid', () => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, 'TOKENVALUE');
    jwtHelper.isTokenExpired.and.returnValue(true);

    const isAuthenticated = service.isAuthenticated();

    expect(isAuthenticated).toBeFalse();
    expect(localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY)).toBeNull();
  });

  it('isAuthenticated - token not set', () => {
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);

    const isAuthenticated = service.isAuthenticated();

    expect(isAuthenticated).toBeFalse();
    expect(jwtHelper.isTokenExpired).not.toHaveBeenCalled();
  });

  it('hasRole - role exists', () => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, 'TOKENVALUE');
    jwtHelper.decodeToken.and.returnValue(<JwtToken>{ roles: ['ROLE1'] });

    const hasRole = service.hasRole('ROLE1');

    expect(hasRole).toBeTrue();
  });

  it('hasRole - role doesnt exist', () => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, 'TOKENVALUE');
    jwtHelper.decodeToken.and.returnValue(<JwtToken>{ roles: ['ROLE2'] });

    const hasRole = service.hasRole('ROLE1');

    expect(hasRole).toBeFalse();
  });

  it('hasRole - no roles given', () => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, 'TOKENVALUE');
    jwtHelper.decodeToken.and.returnValue(<JwtToken>{ roles: [] });

    const hasRole = service.hasRole('ROLE1');

    expect(hasRole).toBeFalse();
  });

  it('hasRole - no roles field defined', () => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, 'TOKENVALUE');
    jwtHelper.decodeToken.and.returnValue(<JwtToken>{});

    const hasRole = service.hasRole('ROLE1');

    expect(hasRole).toBeFalse();
  });

  it('getToken - exists', () => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, 'TOKENVALUE');

    const token = service.getToken();

    expect(token).toBe('TOKENVALUE');
  });

  it('getToken - not existing', () => {
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);

    const token = service.getToken();

    expect(token).toBeNull();
  });

  it('removeToken - exists', () => {
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, 'VALUE');

    service.removeToken();

    expect(localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY)).toBeNull();
  });

  it('removeToken - not existing', () => {
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);

    service.removeToken();

    expect(localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY)).toBeNull();
  });

});

interface JwtToken {
  roles: string[];
}
