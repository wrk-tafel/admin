import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {provideHttpClient} from '@angular/common/http';
import {RouteApiService} from './route-api.service';
import {provideZonelessChangeDetection} from "@angular/core";

describe('RouteApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: RouteApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        RouteApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(RouteApiService);
  });

  it('get routes', () => {
    apiService.getRoutes().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: `/routes`});

    req.flush(null);
    httpMock.verify();
  });

});
