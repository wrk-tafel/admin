import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {provideHttpClient} from '@angular/common/http';
import {CarApiService} from './car-api.service';

describe('CarApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: CarApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CarApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(CarApiService);
  });

  it('get cars', () => {
    apiService.getCars().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: `/cars`});

    req.flush(null);
    httpMock.verify();
  });

});
