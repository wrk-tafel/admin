import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {JwtHelperService} from '@auth0/angular-jwt';

import {AuthenticationService} from './authentication.service';

describe('AuthenticationService', () => {
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

  it('login successful', async () => {
    const responseBody = {username: 'test-user', permissions: ['PERM1'], passwordChangeRequired: false};

    service.login('USER', 'PWD').then(response => {
      expect(response).toEqual({successful: true, passwordChangeRequired: false});
      expect(service.username).toEqual(responseBody.username);
      expect(service.permissions).toEqual(responseBody.permissions);
    });

    const mockReq = httpMock.expectOne('/login');
    expect(mockReq.request.method).toBe('POST');
    expect(mockReq.request.headers.get('Authorization')).toBe('Basic ' + btoa('USER:PWD'));

    const mockErrorResponse = {status: 200, statusText: 'OK'};
    mockReq.flush(responseBody, mockErrorResponse);
    httpMock.verify();

    expect(router.navigate).not.toHaveBeenCalledWith(['login/passwortaendern']);
  });

  it('login successful but passwordchange is required', async () => {
    const responseBody = {username: 'test-user', permissions: [], passwordChangeRequired: true};

    service.login('USER', 'PWD').then(response => {
      expect(response).toEqual({successful: true, passwordChangeRequired: true});
      expect(service.username).toEqual(responseBody.username);
      expect(service.permissions).toEqual(responseBody.permissions);
    });

    const mockReq = httpMock.expectOne('/login');
    expect(mockReq.request.method).toBe('POST');
    expect(mockReq.request.headers.get('Authorization')).toBe('Basic ' + btoa('USER:PWD'));

    const mockErrorResponse = {status: 200, statusText: 'OK'};

    mockReq.flush(responseBody, mockErrorResponse);
    httpMock.verify();
  });

  it('login failed', async () => {
    service.login('USER', 'PWD').then(response => {
      expect(response).toEqual({successful: false, passwordChangeRequired: false});
    });

    const mockReq = httpMock.expectOne('/login');
    expect(mockReq.request.method).toBe('POST');
    expect(mockReq.request.headers.get('Authorization')).toBe('Basic ' + btoa('USER:PWD'));

    const mockErrorResponse = {status: 403, statusText: 'Forbidden'};
    mockReq.flush(null, mockErrorResponse);
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
    service.permissions = ['PERM1'];

    const hasPermission = service.hasPermission('PERM1');

    expect(hasPermission).toBeTrue();
  });

  it('hasPermission - permission doesnt exist', () => {
    service.permissions = ['PERM2'];

    const hasPermission = service.hasPermission('PERM1');

    expect(hasPermission).toBeFalse();
  });

  it('hasPermission - no permissions given', () => {
    service.permissions = [];

    const hasPermission = service.hasPermission('PERM1');

    expect(hasPermission).toBeFalse();
  });

  it('getUsername - authenticated', () => {
    service.username = 'test-user';

    const username = service.getUsername();

    expect(username).toBe('test-user');
  });

  it('getUsername - not authenticated', () => {
    const username = service.getUsername();

    expect(username).toEqual(undefined);
  });

  it('hasAnyPermissions - no permissions', () => {
    service.permissions = [];

    const hasAnyPermissions = service.hasAnyPermissions();

    expect(hasAnyPermissions).toBeFalse();
  });

  it('hasAnyPermissions - given permissions', () => {
    service.permissions = ['PERM1'];

    const hasAnyPermissions = service.hasAnyPermissions();

    expect(hasAnyPermissions).toBeTrue();
  });

});
