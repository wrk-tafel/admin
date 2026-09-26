import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {SUPPRESS_ERROR_TOAST} from '../common/http/suppress-error-toast.token';
import {PendingDeletionsApiService, PendingUserDeletionListResponse} from './pending-deletions-api.service';

describe('PendingDeletionsApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: PendingDeletionsApiService;

  const emptyList = {
    enabled: true,
    retentionText: '1 Jahr',
    warningText: '30 Tagen',
    totalCount: 0,
    currentPage: 1,
    totalPages: 0,
    pageSize: 10,
    items: []
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting()
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(PendingDeletionsApiService);
  });

  afterEach(() => httpMock.verify());

  it('get pending user deletions with page and page size', () => {
    const testData: PendingUserDeletionListResponse = {
      ...emptyList,
      totalCount: 1,
      totalPages: 1,
      items: [{
        id: 1,
        username: 'user1',
        firstname: 'Max',
        lastname: 'Muster',
        personnelNumber: '00100',
        lastLogin: null,
        createdAt: '2025-01-01T10:00:00Z',
        deletionDate: '2026-10-01'
      }]
    };

    let result: PendingUserDeletionListResponse | undefined;
    apiService.getPendingUserDeletions(2, 25).subscribe(response => result = response);

    const req = httpMock.expectOne(request => request.method === 'GET' && request.url === '/settings/pending-deletions/users');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('25');
    expect(req.request.context.get(SUPPRESS_ERROR_TOAST)).toBe(true);
    req.flush(testData);

    expect(result).toEqual(testData);
  });

  it('get pending household deletions', () => {
    apiService.getPendingHouseholdDeletions(1, 10).subscribe();

    const req = httpMock.expectOne(request => request.url === '/settings/pending-deletions/households');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    expect(req.request.context.get(SUPPRESS_ERROR_TOAST)).toBe(true);
    req.flush(emptyList);
  });

  it('get pending employee deletions', () => {
    apiService.getPendingEmployeeDeletions(3, 5).subscribe();

    const req = httpMock.expectOne(request => request.url === '/settings/pending-deletions/employees');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('3');
    expect(req.request.params.get('pageSize')).toBe('5');
    expect(req.request.context.get(SUPPRESS_ERROR_TOAST)).toBe(true);
    req.flush(emptyList);
  });

  it('sends no query parameters when no page is given', () => {
    apiService.getPendingUserDeletions().subscribe();

    const req = httpMock.expectOne(request => request.url === '/settings/pending-deletions/users');
    expect(req.request.params.keys()).toEqual([]);
    req.flush(emptyList);
  });
});
