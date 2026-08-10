import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ChangePasswordRequest, ChangePasswordResponse, LoginAttemptItem, UserApiService, UserData} from './user-api.service';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {PagedResponse} from '../common/api/paged-response';

describe('UserApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: UserApiService;

  const mockUser: UserData = {
    id: 0,
    personnelNumber: '0000',
    username: 'username',
    firstname: 'first',
    lastname: 'last',
    enabled: true,
    passwordChangeRequired: true,
    permissions: []
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        UserApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(UserApiService);
  });

  it('changed password called', () => {
    const testRequest: ChangePasswordRequest = {
      passwordCurrent: 'pwd-current',
      passwordNew: 'pwd-new'
    };
    const testResponse: ChangePasswordResponse = {
      message: 'msg',
      details: ['detail1', 'detail2']
    };

    apiService.changePassword(testRequest).subscribe((response: ChangePasswordResponse) => {
      expect(response).toEqual(testResponse);
    });

    const req = httpMock.expectOne({method: 'POST', url: '/users/change-password'});
    req.flush(testResponse);
    httpMock.verify();
  });

  it('get user for personnel number', () => {
    apiService.getUserForPersonnelNumber('p1a2').subscribe((userData) => {
      expect(userData).toEqual(mockUser);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/users/personnel-number/p1a2'});
    req.flush(mockUser);
    httpMock.verify();
  });

  it('search user with all parameters', () => {
    apiService.searchUser('mustermann', false, 3).subscribe();

    const req = httpMock.expectOne({
      method: 'GET',
      url: '/users?searchInput=mustermann&enabled=false&page=3'
    });
    req.flush(null);
    httpMock.verify();
  });

  it('search user with a search input only', () => {
    apiService.searchUser('mustermann', null).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/users?searchInput=mustermann'});
    req.flush(null);
    httpMock.verify();
  });

  it('get user for id', () => {
    apiService.getUserForId(1234).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/users/1234'});
    req.flush(null);
    httpMock.verify();
  });

  it('update user', () => {
    const mockUserUpdate: UserData = {
      id: 133,
      username: 'username',
      personnelNumber: 'persNr',
      lastname: 'Mustermann',
      firstname: 'Max',
      enabled: true,
      passwordChangeRequired: true,
      permissions: []
    };
    apiService.updateUser(mockUserUpdate).subscribe();

    const req = httpMock.expectOne({method: 'PUT', url: '/users/133'});
    req.flush(null);
    httpMock.verify();

    expect(req.request.body).toEqual(mockUserUpdate);
  });

  it('delete user', () => {
    apiService.deleteUser(1).subscribe();

    const req = httpMock.expectOne({method: 'DELETE', url: '/users/1'});
    req.flush(null);
    httpMock.verify();
  });

  it('create user', () => {
    apiService.createUser(mockUser).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/users'});
    expect(req.request.body).toEqual(mockUser);
    req.flush(null);
    httpMock.verify();
  });

  it('get permissions', () => {
    apiService.getPermissions().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/users/permissions'});
    req.flush(null);
    httpMock.verify();
  });

  it('get login attempts', () => {
    const testResponse: PagedResponse<LoginAttemptItem> = {
      items: [
        {id: 1, username: 'user1', failureCount: 3, lastFailureAt: '2026-01-01T10:00:00', lockedUntil: '2026-01-01T10:15:00'},
        {id: 2, username: 'user2', failureCount: 1, lastFailureAt: '2026-01-01T09:00:00', lockedUntil: null}
      ],
      totalCount: 2,
      currentPage: 1,
      totalPages: 1,
      pageSize: 10
    };

    apiService.getLoginAttempts().subscribe((data: PagedResponse<LoginAttemptItem>) => {
      expect(data).toEqual(testResponse);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/users/login-attempts'});
    req.flush(testResponse);
    httpMock.verify();
  });

  it('get login attempts with page and pageSize', () => {
    const page = 2;
    const pageSize = 25;

    apiService.getLoginAttempts(page, pageSize).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: `/users/login-attempts?page=${page}&pageSize=${pageSize}`});
    req.flush({items: []});
    httpMock.verify();
  });

  it('delete login attempt', () => {
    apiService.deleteLoginAttempt(1).subscribe();

    const req = httpMock.expectOne({method: 'DELETE', url: '/users/login-attempts/1'});
    req.flush(null);
    httpMock.verify();
  });

});
