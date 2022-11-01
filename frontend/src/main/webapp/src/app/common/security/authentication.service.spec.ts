import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {JwtHelperService} from '@auth0/angular-jwt';

import {AuthenticationService} from './authentication.service';

describe('AuthenticationService', () => {
  const SESSION_STORAGE_TOKEN_KEY = 'jwt';

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

    httpMock = TestBed.inject(HttpTestingController);

    jwtHelper = TestBed.inject(JwtHelperService) as jasmine.SpyObj<JwtHelperService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    service = TestBed.inject(AuthenticationService);
  });

  it('login successful', () => {
    sessionStorage.removeItem(SESSION_STORAGE_TOKEN_KEY);

    service.login('USER', 'PWD').then(response => {
      // TODO improve - these calls are probably not checked currently
      expect(sessionStorage.getItem(SESSION_STORAGE_TOKEN_KEY)).toBe('TOKENVALUE');
      expect(response).toBeTrue();
    });

    const mockReq = httpMock.expectOne('/login');
    expect(mockReq.request.method).toBe('POST');
    expect(mockReq.request.body).toBe('username=USER&password=PWD');

    const mockErrorResponse = {status: 200, statusText: 'OK'};
    const data = {token: 'TOKENVALUE'};
    mockReq.flush(data, mockErrorResponse);
    httpMock.verify();

    expect(router.navigate).not.toHaveBeenCalledWith(['login/passwortaendern']);
  });

  it('login successful but passwordchange is required', () => {
    sessionStorage.removeItem(SESSION_STORAGE_TOKEN_KEY);

    service.login('USER', 'PWD').then(response => {
      // TODO improve - these calls are probably not checked currently
      expect(sessionStorage.getItem(SESSION_STORAGE_TOKEN_KEY)).toBe('TOKENVALUE');
      expect(response).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['login/passwortaendern']);
    });

    const mockReq = httpMock.expectOne('/login');
    expect(mockReq.request.method).toBe('POST');
    expect(mockReq.request.body).toBe('username=USER&password=PWD');

    const mockErrorResponse = {status: 200, statusText: 'OK'};
    const data = {token: 'TOKENVALUE', passwordChangeRequired: true};
    mockReq.flush(data, mockErrorResponse);
    httpMock.verify();
  });

  it('login failed', () => {
    sessionStorage.setItem(SESSION_STORAGE_TOKEN_KEY, 'OLDVALUE');

    service.login('USER', 'PWD').then(response => {
      expect(sessionStorage.getItem(SESSION_STORAGE_TOKEN_KEY)).toBeNull();
      expect(response).toBeFalse();
    });

    const mockReq = httpMock.expectOne('/login');
    expect(mockReq.request.method).toBe('POST');
    expect(mockReq.request.body).toBe('username=USER&password=PWD');

    const mockErrorResponse = {status: 403, statusText: 'Forbidden'};
    mockReq.flush(null, mockErrorResponse);
    httpMock.verify();
  });

  it('logoutAndRedirect - token set and valid', () => {
    sessionStorage.setItem(SESSION_STORAGE_TOKEN_KEY, 'TOKENVALUE');
    jwtHelper.isTokenExpired.and.returnValue(false);

    service.logoutAndRedirect();

    expect(sessionStorage.getItem(SESSION_STORAGE_TOKEN_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['login']);
  });

  it('logoutAndRedirect - token set and expired', () => {
    sessionStorage.setItem(SESSION_STORAGE_TOKEN_KEY, 'TOKENVALUE');
    jwtHelper.isTokenExpired.and.returnValue(true);

    service.logoutAndRedirect();

    expect(sessionStorage.getItem(SESSION_STORAGE_TOKEN_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['login', 'abgelaufen']);
  });

  it('logoutAndRedirect - token not set', () => {
    sessionStorage.removeItem(SESSION_STORAGE_TOKEN_KEY);

    service.logoutAndRedirect();

    expect(router.navigate).toHaveBeenCalledWith(['login']);
  });

  it('isAuthenticated - token set and valid', () => {
    sessionStorage.setItem(SESSION_STORAGE_TOKEN_KEY, 'TOKENVALUE');
    jwtHelper.isTokenExpired.and.returnValue(false);

    const isAuthenticated = service.isAuthenticated();

    expect(isAuthenticated).toBeTrue();
  });

  it('isAuthenticated - token set but invalid', () => {
    sessionStorage.setItem(SESSION_STORAGE_TOKEN_KEY, 'TOKENVALUE');
    jwtHelper.isTokenExpired.and.returnValue(true);

    const isAuthenticated = service.isAuthenticated();

    expect(isAuthenticated).toBeFalse();
  });

  it('isAuthenticated - token not set', () => {
    sessionStorage.removeItem(SESSION_STORAGE_TOKEN_KEY);

    const isAuthenticated = service.isAuthenticated();

    expect(isAuthenticated).toBeFalse();
    expect(jwtHelper.isTokenExpired).not.toHaveBeenCalled();
  });

  it('hasPermission - permission exists', () => {
    sessionStorage.setItem(SESSION_STORAGE_TOKEN_KEY, 'TOKENVALUE');
    jwtHelper.decodeToken.and.returnValue(<JwtToken>{permissions: ['PERM1']});

    const hasPermission = service.hasPermission('PERM1');

    expect(hasPermission).toBeTrue();
  });

  it('hasPermission - permission doesnt exist', () => {
    sessionStorage.setItem(SESSION_STORAGE_TOKEN_KEY, 'TOKENVALUE');
    jwtHelper.decodeToken.and.returnValue(<JwtToken>{permissions: ['PERM2']});

    const hasPermission = service.hasPermission('PERM1');

    expect(hasPermission).toBeFalse();
  });

  it('hasPermission - no permissions given', () => {
    sessionStorage.setItem(SESSION_STORAGE_TOKEN_KEY, 'TOKENVALUE');
    jwtHelper.decodeToken.and.returnValue(<JwtToken>{permissions: []});

    const hasPermission = service.hasPermission('PERM1');

    expect(hasPermission).toBeFalse();
  });

  it('hasPermission - no permissions field defined', () => {
    sessionStorage.setItem(SESSION_STORAGE_TOKEN_KEY, 'TOKENVALUE');
    jwtHelper.decodeToken.and.returnValue(<JwtToken>{});

    const hasPermission = service.hasPermission('PERM1');

    expect(hasPermission).toBeFalse();
  });

  it('getToken - exists', () => {
    sessionStorage.setItem(SESSION_STORAGE_TOKEN_KEY, 'TOKENVALUE');

    const token = service.getTokenString();

    expect(token).toBe('TOKENVALUE');
  });

  it('getToken - not existing', () => {
    sessionStorage.removeItem(SESSION_STORAGE_TOKEN_KEY);

    const token = service.getTokenString();

    expect(token).toBeNull();
  });

  it('removeToken - exists', () => {
    sessionStorage.setItem(SESSION_STORAGE_TOKEN_KEY, 'VALUE');

    service.removeToken();

    expect(sessionStorage.getItem(SESSION_STORAGE_TOKEN_KEY)).toBeNull();
  });

  it('removeToken - not existing', () => {
    sessionStorage.removeItem(SESSION_STORAGE_TOKEN_KEY);

    service.removeToken();

    expect(sessionStorage.getItem(SESSION_STORAGE_TOKEN_KEY)).toBeNull();
  });

  it('getUsername - authenticated', () => {
    sessionStorage.setItem(SESSION_STORAGE_TOKEN_KEY, 'TOKENVALUE');
    jwtHelper.decodeToken.and.returnValue(<JwtToken>{sub: 'test-user', permissions: []});

    const username = service.getUsername();

    expect(username).toBe('test-user');
  });

  it('getUsername - not authenticated', () => {
    sessionStorage.removeItem(SESSION_STORAGE_TOKEN_KEY);

    const username = service.getUsername();

    expect(username).toEqual(undefined);
  });

  it('hasAnyPermissions - no permissions', () => {
    sessionStorage.setItem(SESSION_STORAGE_TOKEN_KEY, 'TOKENVALUE');
    jwtHelper.decodeToken.and.returnValue(<JwtToken>{permissions: []});

    const hasAnyPermissions = service.hasAnyPermissions();

    expect(hasAnyPermissions).toBeFalse();
  });

  it('hasAnyPermissions - given permissions', () => {
    sessionStorage.setItem(SESSION_STORAGE_TOKEN_KEY, 'TOKENVALUE');
    jwtHelper.decodeToken.and.returnValue(<JwtToken>{permissions: ['PERM1']});

    const hasAnyPermissions = service.hasAnyPermissions();

    expect(hasAnyPermissions).toBeTrue();
  });

});

interface JwtToken {
  permissions: string[];
}
