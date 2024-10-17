import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {CountryApiService, CountryData} from './country-api.service';
import {provideHttpClient} from "@angular/common/http";

describe('CountryApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: CountryApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CountryApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(CountryApiService);
  });

  it('fetch countries and map correctly', () => {
    const mockCountries = [
      {id: 0, code: 'AT', name: 'Österreich'},
      {id: 1, code: 'DE', name: 'Deutschland'}
    ];

    apiService.getCountries().subscribe((data: CountryData[]) => {
      expect(data).toEqual(mockCountries);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/countries'});
    req.flush({items: mockCountries});
    httpMock.verify();
  });

});
