import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {CountryAdminData, CountryApiService, CountryCreateData, CountryList, CountryListResult} from './country-api.service';
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

  it('fetch all countries for admin', () => {
    const mockCountries: CountryAdminData[] = [
      {id: 0, code: 'AT', name: 'Österreich', enabled: true},
      {id: 1, code: 'DE', name: 'Deutschland', enabled: false}
    ];

    apiService.getAllCountries().subscribe((data: CountryList) => {
      expect(data).toEqual({items: mockCountries});
    });

    const req = httpMock.expectOne({method: 'GET', url: '/countries/admin'});
    req.flush({items: mockCountries});
    httpMock.verify();
  });

  it('create country', () => {
    const newCountry: CountryCreateData = {code: 'ZZ', name: 'Neuland', enabled: true};
    const createdCountry: CountryAdminData = {id: 2, ...newCountry};

    apiService.createCountry(newCountry).subscribe((data: CountryAdminData) => {
      expect(data).toEqual(createdCountry);
    });

    const req = httpMock.expectOne({method: 'POST', url: '/countries'});
    expect(req.request.body).toEqual(newCountry);
    req.flush(createdCountry);
    httpMock.verify();
  });

  it('update country', () => {
    const updatedCountry: CountryAdminData = {id: 0, code: 'AT', name: 'Österreich', enabled: false};

    apiService.updateCountry(0, updatedCountry).subscribe((data: CountryAdminData) => {
      expect(data).toEqual(updatedCountry);
    });

    const req = httpMock.expectOne({method: 'PUT', url: '/countries/0'});
    expect(req.request.body).toEqual(updatedCountry);
    req.flush(updatedCountry);
    httpMock.verify();
  });

});
