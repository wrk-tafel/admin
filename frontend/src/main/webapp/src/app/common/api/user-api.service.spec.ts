import {HttpClient} from '@angular/common/http';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {UserApiService} from "./user-api.service";

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

  it('changed password successfully', () => {
    /*
    const mockCountries = [
      {id: 0, code: 'AT', name: 'Österreich'},
      {id: 1, code: 'DE', name: 'Deutschland'}
    ];

    apiService.getCountries().subscribe((data) => {
      expect(data).toEqual(mockCountries);
    });

    const req = httpMock.expectOne('/countries');
    req.flush({items: mockCountries});
    httpMock.verify();
     */
  });

});
