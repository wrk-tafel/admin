import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {ReturnBoxesApiService} from './return-boxes-api.service';

describe('ReturnBoxesApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: ReturnBoxesApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), ReturnBoxesApiService]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(ReturnBoxesApiService);
  });

  it('get return boxes', () => {
    apiService.getReturnBoxes().subscribe();

    httpMock.expectOne({method: 'GET', url: '/return-boxes'}).flush({routes: []});
    httpMock.verify();
  });

  it('set returned', () => {
    apiService.setReturned(2, 20, true).subscribe();

    const req = httpMock.expectOne({method: 'PUT', url: '/return-boxes/routes/2/shops/20'});
    expect(req.request.body).toEqual({returned: true});

    req.flush({routes: []});
    httpMock.verify();
  });
});
