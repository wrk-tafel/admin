import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';

import {AuthenticationService} from './authentication.service';
import {provideHttpClient} from '@angular/common/http';
import {provideZonelessChangeDetection} from "@angular/core";

describe('AuthenticationService', () => {
  let httpMock: HttpTestingController;

  let router: jasmine.SpyObj<Router>;
  let service: AuthenticationService;

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthenticationService,
        {
          provide: Router,
          useValue: routerSpy
        }
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);

    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    service = TestBed.inject(AuthenticationService);
  });

  it('login successful', async () => {
    const loginResponseBody = {passwordChangeRequired: false};
    const userInfoResponseBody = {username: 'test-user', permissions: ['PERM1']};

    service.login('USER', 'PWD').then(response => {
      expect(response).toEqual({successful: true, passwordChangeRequired: false});
      expect(service.userInfo.username).toBe(userInfoResponseBody.username);
      expect(service.userInfo.permissions).toEqual(userInfoResponseBody.permissions);
    });

    const mockLoginReq = httpMock.expectOne('/login');
    expect(mockLoginReq.request.method).toBe('POST');
    expect(mockLoginReq.request.headers.get('Authorization')).toBe('Basic ' + btoa('USER:PWD'));

    const mockLoginResponse = {status: 200, statusText: 'OK'};
    mockLoginReq.flush(loginResponseBody, mockLoginResponse);

    const mockUserInfoReq = httpMock.expectOne('/users/info');
    expect(mockUserInfoReq.request.method).toBe('GET');

    const mockUserInfoResponse = {status: 200, statusText: 'OK'};
    mockUserInfoReq.flush(userInfoResponseBody, mockUserInfoResponse);

    httpMock.verify();

    expect(router.navigate).not.toHaveBeenCalledWith(['/login/passwortaendern']);
  });

  it('login successful but passwordchange is required', async () => {
    const loginResponseBody = {passwordChangeRequired: true};
    const userInfoResponseBody = {username: 'test-user', permissions: []};

    service.login('USER', 'PWD').then(response => {
      expect(response).toEqual({successful: true, passwordChangeRequired: true});
      expect(service.userInfo.username).toBe(userInfoResponseBody.username);
      expect(service.userInfo.permissions).toEqual(userInfoResponseBody.permissions);
    });

    const loginMockReq = httpMock.expectOne('/login');
    expect(loginMockReq.request.method).toBe('POST');
    expect(loginMockReq.request.headers.get('Authorization')).toBe('Basic ' + btoa('USER:PWD'));

    const loginMockResponse = {status: 200, statusText: 'OK'};
    loginMockReq.flush(loginResponseBody, loginMockResponse);

    const mockUserInfoReq = httpMock.expectOne('/users/info');
    expect(mockUserInfoReq.request.method).toBe('GET');

    const mockUserInfoResponse = {status: 200, statusText: 'OK'};
    mockUserInfoReq.flush(userInfoResponseBody, mockUserInfoResponse);

    httpMock.verify();
  });

  it('login failed', async () => {
    service.userInfo = {username: 'test123', permissions: []};

    service.login('USER', 'PWD').then(response => {
      expect(response).toEqual({successful: false, passwordChangeRequired: false});
      // check if it's reset
      expect(service.userInfo).toBeNull();
    });

    const loginMockReq = httpMock.expectOne('/login');
    expect(loginMockReq.request.method).toBe('POST');
    expect(loginMockReq.request.headers.get('Authorization')).toBe('Basic ' + btoa('USER:PWD'));

    const loginMockResponse = {status: 403, statusText: 'Forbidden'};
    loginMockReq.flush(null, loginMockResponse);

    httpMock.expectNone('/users/info');

    httpMock.verify();
  });

  it('redirectToLogin without msgKey', () => {
    service.redirectToLogin();

    expect(router.navigate).toHaveBeenCalledWith(['login']);
  });

  it('redirectToLogin with msgKey', () => {
    service.redirectToLogin('key123');

    expect(router.navigate).toHaveBeenCalledWith(['login', 'key123']);
  });

  it('hasPermission - permission exists', () => {
    service.userInfo = {username: 'test123', permissions: ['PERM1']};

    const hasPermission = service.hasPermission('PERM1');

    expect(hasPermission).toBeTrue();
  });

  it('hasPermission - permission doesnt exist', () => {
    service.userInfo = {username: 'test123', permissions: ['PERM2']};

    const hasPermission = service.hasPermission('PERM1');

    expect(hasPermission).toBeFalse();
  });

  it('hasPermission - no permissions given', () => {
    service.userInfo = {username: 'test123', permissions: []};

    const hasPermission = service.hasPermission('PERM1');

    expect(hasPermission).toBeFalse();
  });

  it('getUsername - authenticated', () => {
    service.userInfo = {username: 'test-user', permissions: []};

    const username = service.getUsername();

    expect(username).toBe('test-user');
  });

  it('getUsername - not authenticated', () => {
    const username = service.getUsername();

    expect(username).toEqual(undefined);
  });

  it('hasAnyPermission - no permissions', () => {
    service.userInfo = {username: 'test-user', permissions: []};

    const hasAnyPermission = service.hasAnyPermission();

    expect(hasAnyPermission).toBeFalse();
  });

  it('hasAnyPermission - given permissions', () => {
    service.userInfo = {username: 'test-user', permissions: ['PERM1']};

    const hasAnyPermission = service.hasAnyPermission();

    expect(hasAnyPermission).toBeTrue();
  });

  it('logout', () => {
    service.userInfo = {username: 'test-user', permissions: ['PERM1']};

    /* eslint-disable @typescript-eslint/no-unused-vars */
    service.logout().subscribe(response => {
      expect(service.userInfo).toBeNull();
    });

    const mockReq = httpMock.expectOne('/users/logout');
    expect(mockReq.request.method).toBe('POST');

    const mockErrorResponse = {status: 200, statusText: 'OK'};
    mockReq.flush(null, mockErrorResponse);
    httpMock.verify();
  });

  it('isAuthenticated true', () => {
    service.userInfo = {username: 'test-user', permissions: ['PERM1']};

    const isAuthenticated = service.isAuthenticated();

    expect(isAuthenticated).toBeTruthy();
  });

  it('isAuthenticated false', () => {
    service.userInfo = null;

    const isAuthenticated = service.isAuthenticated();

    expect(isAuthenticated).toBeFalsy();
  });

  it('hasAnyPermissionOf - single permission exists', () => {
    service.userInfo = {username: 'test123', permissions: ['PERM1', 'PERM2']};

    const hasPermission = service.hasAnyPermissionOf(['PERM1']);

    expect(hasPermission).toBeTrue();
  });

  it('hasAnyPermissionOf - multiple permissions exist and one does not exist', () => {
    service.userInfo = {username: 'test123', permissions: ['PERM1', 'PERM2']};

    const hasPermission = service.hasAnyPermissionOf(['PERM1', 'PERM2', 'PERM3']);

    expect(hasPermission).toBeTrue();
  });

  it('hasAnyPermissionOf - permission doesnt exist', () => {
    service.userInfo = {username: 'test123', permissions: ['PERM2']};

    const hasPermission = service.hasAnyPermissionOf(['PERM1']);

    expect(hasPermission).toBeFalse();
  });

  it('hasAnyPermissionOf - no permissions given', () => {
    service.userInfo = {username: 'test123', permissions: []};

    const hasPermission = service.hasAnyPermissionOf(['PERM1']);

    expect(hasPermission).toBeFalse();
  });

});
