import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {SUPPRESS_ERROR_TOAST} from '../common/http/suppress-error-toast.token';
import {PendingDeletionsApiService, PendingDeletionsResponse} from './pending-deletions-api.service';

describe('PendingDeletionsApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: PendingDeletionsApiService;

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

  it('get pending deletions', () => {
    const testData: PendingDeletionsResponse = {
      users: {
        enabled: true,
        retentionText: '1 Jahr',
        warningText: '30 Tagen',
        totalCount: 1,
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
      },
      households: null,
      employees: null
    };

    let result: PendingDeletionsResponse | undefined;
    apiService.getPendingDeletions().subscribe(response => result = response);

    const req = httpMock.expectOne({method: 'GET', url: '/settings/pending-deletions'});
    expect(req.request.context.get(SUPPRESS_ERROR_TOAST)).toBe(true);
    req.flush(testData);

    expect(result).toEqual(testData);
    httpMock.verify();
  });
});
