import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {AuditApiService, AuditEntriesResponse} from './audit-api.service';

describe('AuditApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: AuditApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuditApiService,
        provideHttpClient(withXhr()),
        provideHttpClientTesting()
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(AuditApiService);
  });

  it('search without a filter asks for the whole log', () => {
    apiService.searchAuditEntries().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/audit'});
    req.flush(null);
    httpMock.verify();
  });

  it('search passes every given filter as a query parameter', () => {
    apiService.searchAuditEntries({
      entityType: 'Household',
      operation: 'UPDATE',
      actorUsername: 'test-user',
      businessKey: '1234',
      from: '2026-01-01',
      to: '2026-01-31'
    }, 2, 25).subscribe();

    const req = httpMock.expectOne(request => request.url === '/audit');
    expect(req.request.params.get('entityType')).toBe('Household');
    expect(req.request.params.get('operation')).toBe('UPDATE');
    expect(req.request.params.get('actorUsername')).toBe('test-user');
    expect(req.request.params.get('businessKey')).toBe('1234');
    expect(req.request.params.get('from')).toBe('2026-01-01');
    expect(req.request.params.get('to')).toBe('2026-01-31');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('25');
    req.flush(null);
    httpMock.verify();
  });

  it('search leaves out filters that were not set', () => {
    apiService.searchAuditEntries({entityType: null, actorUsername: ''}).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/audit'});
    expect(req.request.params.keys()).toEqual([]);
    req.flush(null);
    httpMock.verify();
  });

  it('get filter options', () => {
    apiService.getFilterOptions().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/audit/filter-options'});
    req.flush(null);
    httpMock.verify();
  });

  it('get history for customer', () => {
    const response: AuditEntriesResponse = {
      items: [{
        id: 1,
        occurredAt: new Date(),
        actorUsername: 'test-user',
        entityType: 'Household',
        entityId: 5,
        businessKey: '1234',
        operation: 'UPDATE',
        changes: [{field: 'addressCity', oldValue: 'Wien', newValue: 'Graz'}]
      }],
      totalCount: 1,
      currentPage: 1,
      totalPages: 1,
      pageSize: 10
    };

    apiService.getHistoryForCustomer(1234).subscribe(result => expect(result).toEqual(response));

    const req = httpMock.expectOne({method: 'GET', url: '/audit/households/1234'});
    req.flush(response);
    httpMock.verify();
  });

  it('get history for customer including paging parameters', () => {
    apiService.getHistoryForCustomer(1234, 3, 50).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/audit/households/1234?page=3&pageSize=50'});
    req.flush(null);
    httpMock.verify();
  });
});
