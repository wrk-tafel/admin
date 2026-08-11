import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {
  ChildrenAgeDistribution,
  ChildrenFilter,
  ChildrenSearchResult,
  StatisticsApiService,
  StatisticsData,
  StatisticsSettings
} from './statistics-api.service';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

describe('StatisticsApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: StatisticsApiService;

  const filter: ChildrenFilter = {
    ageMin: 6,
    ageMax: 10,
    referenceDate: new Date('2026-09-01T00:00:00')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
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
    const fromDate = dayjs('1234-01-02', 'YYYY-MM-DD').toDate();
    const toDate = dayjs('4321-01-02', 'YYYY-MM-DD').toDate();
    const testResponse: StatisticsData = {
      beneficiaryCustomers: {
        title: '5',
        subTitle: 'Bezugsberechtigte Haushalte',
        labels: [
          '2026-01',
          '2026-02',
          '2026-03',
        ],
        dataPoints: [5, 5, 5]
      },
      beneficiaryPersons: {
        title: '20',
        subTitle: 'Bezugsberechtigte Personen',
        labels: [
          '2026-01',
          '2026-02',
          '2026-03',
        ],
        dataPoints: [20, 20, 20]
      },
      beneficiaryCustomersWithChildren: {
        title: '2',
        subTitle: 'Bezugsberechtigte Haushalte mit Kindern (Alter <= 15)',
        labels: [
          '2026-01',
          '2026-02',
          '2026-03'
        ],
        dataPoints: [2, 2, 2]
      },
      singleParentHouseholds: {
        title: '1',
        subTitle: 'Alleinerzieher (Haushalte)',
        labels: [
          '2026-01',
          '2026-02',
          '2026-03'
        ],
        dataPoints: [1, 1, 1]
      },
      sheltersCount: {
        title: '0',
        subTitle: 'Notschlafstellen (Anzahl)',
        labels: [
          '2026-01',
          '2026-02',
          '2026-03'
        ],
        dataPoints: [0, 0, 0]
      },
      sheltersAverage: {
        title: '0',
        subTitle: 'Notschlafstellen (Durchschnitt pro Ausgabe)',
        labels: [
          '2026-01',
          '2026-02',
          '2026-03'
        ],
        dataPoints: [0, 0, 0]
      },
      sheltersPersonsCount: {
        title: '0',
        subTitle: 'Spender (Anzahl)',
        labels: [
          '2026-01',
          '2026-02',
          '2026-03'
        ],
        dataPoints: [0, 0, 0]
      },
      shopsCount: {
        title: '0',
        subTitle: 'Spender (Anzahl)',
        labels: [
          '2026-01',
          '2026-02',
          '2026-03'
        ],
        dataPoints: [0, 0, 0]
      },
      shopItemsTotal: {
        title: '0',
        subTitle: 'Warenmenge (Gesamt)',
        labels: [
          '2026-01',
          '2026-02',
          '2026-03'
        ],
        dataPoints: [0, 0, 0]
      },
      shopItemsAverage: {
        title: '0',
        subTitle: 'Warenmenge (Durchschnitt pro Spender)',
        labels: [
          '2026-01',
          '2026-02',
          '2026-03'
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
    const fromDate = dayjs('1234-01-02', 'YYYY-MM-DD').toDate();
    const toDate = dayjs('4321-01-02', 'YYYY-MM-DD').toDate();
    apiService.generateCsv(fromDate, toDate).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/statistics/generate-csv?fromDate=1234-01-02&toDate=4321-01-02'});
    req.flush(null);
    httpMock.verify();
  });

  it('get children data', () => {
    const testResponse: ChildrenSearchResult = {
      items: [
        {householdId: 1, firstname: 'Kind', lastname: 'Mustermann', age: 8}
      ],
      totalCount: 1,
      currentPage: 1,
      totalPages: 1,
      pageSize: 25
    };

    apiService.getChildrenData(filter).subscribe((response) => {
      expect(response).toEqual(testResponse);
    });

    const req = httpMock.expectOne({
      method: 'GET',
      url: '/statistics/children?ageMin=6&ageMax=10&referenceDate=2026-09-01'
    });
    req.flush(testResponse);
  });

  it('get children age distribution', () => {
    const testResponse: ChildrenAgeDistribution = {
      items: [
        {age: 6, count: 2},
        {age: 7, count: 0}
      ]
    };

    apiService.getChildrenAgeDistribution(filter).subscribe((response) => {
      expect(response).toEqual(testResponse);
    });

    const req = httpMock.expectOne({
      method: 'GET',
      url: '/statistics/children/age-distribution?ageMin=6&ageMax=10&referenceDate=2026-09-01'
    });
    req.flush(testResponse);
  });

  it('get children data for a specific page', () => {
    const testResponse: ChildrenSearchResult = {
      items: [],
      totalCount: 30,
      currentPage: 2,
      totalPages: 2,
      pageSize: 25
    };

    apiService.getChildrenData(filter, 2).subscribe((response) => {
      expect(response).toEqual(testResponse);
    });

    const req = httpMock.expectOne({
      method: 'GET',
      url: '/statistics/children?ageMin=6&ageMax=10&referenceDate=2026-09-01&page=2'
    });
    req.flush(testResponse);
  });

  it('generate children csv', () => {
    apiService.generateChildrenCsv(filter).subscribe();

    const req = httpMock.expectOne({
      method: 'GET',
      url: '/statistics/generate-children-csv?ageMin=6&ageMax=10&referenceDate=2026-09-01'
    });
    req.flush(null);
    httpMock.verify();
  });

});
