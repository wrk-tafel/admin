import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {of, throwError} from 'rxjs';
import {CustomerHistoryComponent} from './customer-history.component';
import {AuditApiService, AuditEntriesResponse, AuditEntryItem} from '../../../../api/audit-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('CustomerHistoryComponent', () => {
  const entry: AuditEntryItem = {
    id: 1,
    occurredAt: new Date('2026-08-09T12:00:00'),
    actorUsername: 'test-user',
    entityType: 'Household',
    entityId: 5,
    businessKey: '1234',
    operation: 'UPDATE',
    changes: [{field: 'addressCity', oldValue: 'Wien', newValue: 'Graz'}]
  };
  const pagedResponse: AuditEntriesResponse = {
    items: [entry],
    totalCount: 1,
    currentPage: 1,
    totalPages: 1,
    pageSize: 10
  };

  let auditApiMock: Partial<AuditApiService>;
  let toastrMock: Partial<TafelToastrService>;

  beforeEach(() => {
    auditApiMock = {
      getHistoryForCustomer: vi.fn(() => of<AuditEntriesResponse>(pagedResponse))
    };
    toastrMock = {
      success: vi.fn(),
      error: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: AuditApiService, useValue: auditApiMock},
        {provide: TafelToastrService, useValue: toastrMock}
      ]
    }).compileComponents();
  });

  it('loads the history of the given customer', () => {
    const fixture = TestBed.createComponent(CustomerHistoryComponent);
    fixture.componentRef.setInput('customerId', 1234);
    fixture.detectChanges();

    expect(auditApiMock.getHistoryForCustomer).toHaveBeenCalledWith(1234, undefined, undefined);
    expect(fixture.componentInstance['history']()?.items.length).toBe(1);
  });

  it('paging requests the one-based page the paginator asks for', () => {
    const fixture = TestBed.createComponent(CustomerHistoryComponent);
    fixture.componentRef.setInput('customerId', 1234);
    fixture.detectChanges();

    fixture.componentInstance['onPage'](2, 25);

    expect(auditApiMock.getHistoryForCustomer).toHaveBeenLastCalledWith(1234, 3, 25);
  });

  it('shows an error toast when loading fails', () => {
    auditApiMock.getHistoryForCustomer = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(CustomerHistoryComponent);
    fixture.componentRef.setInput('customerId', 1234);
    fixture.detectChanges();

    expect(toastrMock.error).toHaveBeenCalled();
  });
});
