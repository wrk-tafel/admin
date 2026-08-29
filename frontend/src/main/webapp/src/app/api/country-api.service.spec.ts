import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {CountryApiService, CountryListResult} from './country-api.service';
import {provideHttpClient, withXhr} from '@angular/common/http';

describe('CountryApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: CountryApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
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

    apiService.getCountries().subscribe((data: CountryListResult) => {
      expect(data).toEqual({countries: mockCountries, frequentlyUsedCount: 1});
    });

    const req = httpMock.expectOne({method: 'GET', url: '/countries'});
    req.flush({items: mockCountries, frequentlyUsedCount: 1});
    httpMock.verify();
  });

});
