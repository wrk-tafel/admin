import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {of, throwError} from 'rxjs';
import {AuditLogComponent} from './audit-log.component';
import {
  AuditApiService,
  AuditEntriesResponse,
  AuditEntryItem,
  AuditFilterOptionsResponse
} from '../../../../api/audit-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import dayjs from 'dayjs';

describe('AuditLogComponent', () => {
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
  const filterOptions: AuditFilterOptionsResponse = {
    entityTypes: ['Household', 'Person', 'User'],
    operations: ['INSERT', 'UPDATE', 'DELETE']
  };

  let auditApiMock: Partial<AuditApiService>;
  let toastrMock: Partial<TafelToastrService>;

  beforeEach(() => {
    auditApiMock = {
      searchAuditEntries: vi.fn(() => of<AuditEntriesResponse>(pagedResponse)),
      getFilterOptions: vi.fn(() => of<AuditFilterOptionsResponse>(filterOptions))
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

  it('component can be created', () => {
    const fixture = TestBed.createComponent(AuditLogComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('opens on customers over the last month, rather than on the whole log', () => {
    const fixture = TestBed.createComponent(AuditLogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['entityTypes']()).toEqual(filterOptions.entityTypes);
    expect(component['operations']()).toEqual(filterOptions.operations);
    expect(component['entries']()?.items.length).toBe(1);
    expect(auditApiMock.searchAuditEntries).toHaveBeenCalledWith(
      {
        entityType: 'Household',
        operation: null,
        actorUsername: null,
        businessKey: null,
        from: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
        to: dayjs().format('YYYY-MM-DD')
      },
      undefined,
      undefined
    );
  });

  it('search() passes the current filter values', () => {
    const fixture = TestBed.createComponent(AuditLogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['entityType'].set('Household');
    component['operation'].set('DELETE');
    component['actorUsername'].set('test-user');
    component['businessKey'].set('1234');
    component['from'].set('2026-01-01');
    component['to'].set('2026-01-31');
    component['search'](2, 25);

    expect(auditApiMock.searchAuditEntries).toHaveBeenLastCalledWith(
      {
        entityType: 'Household',
        operation: 'DELETE',
        actorUsername: 'test-user',
        businessKey: '1234',
        from: '2026-01-01',
        to: '2026-01-31'
      },
      2,
      25
    );
  });

  it('paging keeps the current page size when none is given', () => {
    const fixture = TestBed.createComponent(AuditLogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['search'](3);

    expect(auditApiMock.searchAuditEntries).toHaveBeenLastCalledWith(expect.anything(), 3, pagedResponse.pageSize);
  });

  it('resetFilter() returns to the defaults the screen opens on, not to an empty filter', () => {
    const fixture = TestBed.createComponent(AuditLogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component['entityType'].set('User');
    component['actorUsername'].set('test-user');
    component['from'].set('2020-01-01');
    component['resetFilter']();

    expect(component['entityType']()).toBe('Household');
    expect(component['actorUsername']()).toBeNull();
    expect(component['from']()).toBe(dayjs().subtract(1, 'month').format('YYYY-MM-DD'));
    expect(component['to']()).toBe(dayjs().format('YYYY-MM-DD'));
    expect(auditApiMock.searchAuditEntries).toHaveBeenLastCalledWith(
      {
        entityType: 'Household',
        operation: null,
        actorUsername: null,
        businessKey: null,
        from: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
        to: dayjs().format('YYYY-MM-DD')
      },
      undefined,
      pagedResponse.pageSize
    );
  });

  it('shows an error toast when loading fails', () => {
    auditApiMock.searchAuditEntries = vi.fn(() => throwError(() => new Error('failed')));

    const fixture = TestBed.createComponent(AuditLogComponent);
    fixture.detectChanges();

    expect(toastrMock.error).toHaveBeenCalled();
  });

  it('translates entity types and operations into German labels, falling back to the raw key', () => {
    const fixture = TestBed.createComponent(AuditLogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component['entityTypeLabel']('Household')).toBe('Kunde');
    expect(component['entityTypeLabel']('SomethingNew')).toBe('SomethingNew');
    expect(component['operationLabel']('DELETE')).toBe('Gelöscht');
  });
});
