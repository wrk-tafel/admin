import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {CountryApiService, CountryData} from './country-api.service';

describe('CountryApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: CountryApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CountryApiService]
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

    const req = httpMock.expectOne('/countries');
    req.flush({items: mockCountries});
    httpMock.verify();
  });

});
