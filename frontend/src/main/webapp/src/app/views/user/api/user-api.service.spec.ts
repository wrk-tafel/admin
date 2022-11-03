import {HttpClient} from '@angular/common/http';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ChangePasswordRequest, ChangePasswordResponse, UserApiService} from './user-api.service';

describe('UserApiService', () => {
  let client: HttpClient;
  let httpMock: HttpTestingController;
  let apiService: UserApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserApiService]
    });

    client = TestBed.inject(HttpClient);
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

    const req = httpMock.expectOne('/users/change-password');
    req.flush(testResponse);
    httpMock.verify();
  });

});
