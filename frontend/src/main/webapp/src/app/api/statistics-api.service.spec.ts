import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {StatisticsApiService, StatisticsData, StatisticsSettings} from './statistics-api.service';
import moment from 'moment';

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

  it('get data', () => {
    const fromDate = moment('1234-01-02', 'YYYY-MM-DD').toDate();
    const toDate = moment('4321-01-02', 'YYYY-MM-DD').toDate();
    const testResponse: StatisticsData = {
      beneficiaryCustomers: {
        title: "5",
        subTitle: "Bezugsberechtigte Haushalte",
        labels: [
          "2026-01",
          "2026-02",
          "2026-03",
        ],
        dataPoints: [5, 5, 5]
      },
      beneficiaryPersons: {
        title: "20",
        subTitle: "Bezugsberechtigte Personen",
        labels: [
          "2026-01",
          "2026-02",
          "2026-03",
        ],
        dataPoints: [20, 20, 20]
      },
      beneficiaryCustomersWithChildren: {
        title: "2",
        subTitle: "Bezugsberechtigte Haushalte mit Kindern (Alter <= 15)",
        labels: [
          "2026-01",
          "2026-02",
          "2026-03"
        ],
        dataPoints: [2, 2, 2]
      },
      sheltersCount: {
        title: "0",
        subTitle: "Notschlafstellen (Anzahl)",
        labels: [
          "2026-01",
          "2026-02",
          "2026-03"
        ],
        dataPoints: [0, 0, 0]
      },
      sheltersAverage: {
        title: "0",
        subTitle: "Notschlafstellen (Durchschnitt pro Ausgabe)",
        labels: [
          "2026-01",
          "2026-02",
          "2026-03"
        ],
        dataPoints: [0, 0, 0]
      },
      shopsCount: {
        title: "0",
        subTitle: "Spender (Anzahl)",
        labels: [
          "2026-01",
          "2026-02",
          "2026-03"
        ],
        dataPoints: [0, 0, 0]
      },
      shopItemsTotal: {
        title: "0",
        subTitle: "Warenmenge (Gesamt)",
        labels: [
          "2026-01",
          "2026-02",
          "2026-03"
        ],
        dataPoints: [0, 0, 0]
      },
      shopItemsAverage: {
        title: "0",
        subTitle: "Warenmenge (Durchschnitt pro Spender)",
        labels: [
          "2026-01",
          "2026-02",
          "2026-03"
        ],
        dataPoints: [0, 0, 0]
      }
    };

    apiService.getData(fromDate, toDate).subscribe((response) => {
      expect(response).toEqual(testResponse);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/statistics/data?fromDate=1234-01-02&toDate=4321-01-02'});
    expect(req.request.method).toBe('GET');
    req.flush(testResponse);
  });

  it('generate csv', () => {
    const fromDate = moment('1234-01-02', 'YYYY-MM-DD').toDate();
    const toDate = moment('4321-01-02', 'YYYY-MM-DD').toDate();
    apiService.generateCsv(fromDate, toDate).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/statistics/generate-csv?fromDate=1234-01-02&toDate=4321-01-02'});
    req.flush(null);
    httpMock.verify();
  });

});
