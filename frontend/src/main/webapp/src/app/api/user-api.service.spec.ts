import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ChangePasswordRequest, ChangePasswordResponse, UserApiService, UserData} from './user-api.service';
import {provideHttpClient} from '@angular/common/http';

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
        provideHttpClient(),
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
    apiService.searchUser('maxl-username', false, 'mustermann', 'max', 3).subscribe();

    const req = httpMock.expectOne({
      method: 'GET',
      url: '/users?username=maxl-username&enabled=false&lastname=mustermann&firstname=max&page=3'
    });
    req.flush(null);
    httpMock.verify();
  });

  it('search user with lastname only', () => {
    apiService.searchUser(null, null, 'mustermann', null).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/users?lastname=mustermann'});
    req.flush(null);
    httpMock.verify();
  });

  it('search user with firstname only', () => {
    apiService.searchUser(null, null, null, 'max').subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/users?firstname=max'});
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

    const req = httpMock.expectOne({method: 'POST', url: '/users/133'});
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

});
