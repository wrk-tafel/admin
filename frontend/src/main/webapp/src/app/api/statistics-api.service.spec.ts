import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {StatisticsApiService, StatisticsSettings} from './statistics-api.service';

describe('StatisticsApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: StatisticsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(StatisticsApiService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('get settings', () => {
    const testResponse: StatisticsSettings = {
      availableYears: [2024, 2025, 2026],
      distributions: [
        {
          startDate: new Date('2024-01-15T10:00:00'),
          endDate: new Date('2024-01-15T14:00:00')
        },
        {
          startDate: new Date('2024-02-20T10:00:00'),
          endDate: new Date('2024-02-20T14:30:00')
        }
      ]
    };

    apiService.getSettings().subscribe((response) => {
      expect(response).toEqual(testResponse);
      expect(response.availableYears.length).toBe(3);
      expect(response.distributions.length).toBe(2);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/statistics/settings'});
    expect(req.request.method).toBe('GET');
    req.flush(testResponse);
  });

});
