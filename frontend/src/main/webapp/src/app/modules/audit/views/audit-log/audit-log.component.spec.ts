import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {ActivatedRoute, Router, convertToParamMap} from '@angular/router';
import {of, Subject, throwError} from 'rxjs';
import {AuditLogComponent} from './audit-log.component';
import {
  AuditApiService,
  AuditEntriesResponse,
  AuditEntryItem,
  AuditFilterOptionsResponse
} from '../../../../api/audit-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {AuthenticationService} from '../../../../common/security/authentication.service';
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
    operations: ['INSERT', 'UPDATE', 'DELETE'],
    actors: [
      {username: 'test-user', firstname: 'Max', lastname: 'Mustermann'},
      {username: 'other-user'}
    ]
  };
  const defaultFilter = {
    entityType: 'Household',
    operation: null,
    actorUsername: null,
    businessKey: null,
    from: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
    to: dayjs().format('YYYY-MM-DD')
  };

  let auditApiMock: Partial<AuditApiService>;
  let toastrMock: Partial<TafelToastrService>;
  let routerMock: Partial<Router>;
  let queryParams: Record<string, string>;

  beforeEach(() => {
    vi.useFakeTimers();
    queryParams = {};

    auditApiMock = {
      searchAuditEntries: vi.fn(() => of<AuditEntriesResponse>(pagedResponse)),
      getFilterOptions: vi.fn(() => of<AuditFilterOptionsResponse>(filterOptions))
    };
    toastrMock = {
      success: vi.fn(),
      error: vi.fn()
    };
    routerMock = {
      navigate: vi.fn(() => Promise.resolve(true))
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: AuditApiService, useValue: auditApiMock},
        {provide: TafelToastrService, useValue: toastrMock},
        {provide: Router, useValue: routerMock},
        {provide: AuthenticationService, useValue: {hasPermission: () => true}},
        {provide: ActivatedRoute, useValue: {snapshot: {queryParamMap: convertToParamMap(queryParams)}}}
      ]
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(AuditLogComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('component can be created', () => {
    expect(createComponent().componentInstance).toBeTruthy();
  });

  it('opens on customers over the last month, rather than on the whole log', () => {
    const component = createComponent().componentInstance;

    expect(component['entityTypes']()).toEqual(filterOptions.entityTypes);
    expect(component['operations']()).toEqual(filterOptions.operations);
    expect(component['actors']()).toEqual(filterOptions.actors);
    expect(component['entries']()?.items.length).toBe(1);
    expect(auditApiMock.searchAuditEntries).toHaveBeenCalledWith(defaultFilter, undefined, undefined);
  });

  // The plain menu entry has no filters of its own to state, and rewriting the URL with the
  // defaults would make every arrival look like a shared link.
  it('leaves the URL alone until a filter is changed', () => {
    const component = createComponent().componentInstance;
    expect(routerMock.navigate).not.toHaveBeenCalled();

    component['entityType'].set('User');
    component['applyFilter']();

    expect(routerMock.navigate).toHaveBeenCalledWith([], expect.objectContaining({
      replaceUrl: true,
      queryParams: {art: 'User', zugriff: '', benutzer: '', nummer: '', von: defaultFilter.from, bis: defaultFilter.to}
    }));
  });

  it('opens on the filter a link carries, rather than on the defaults', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: AuditApiService, useValue: auditApiMock},
        {provide: TafelToastrService, useValue: toastrMock},
        {provide: Router, useValue: routerMock},
        {provide: AuthenticationService, useValue: {hasPermission: () => true}},
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({
                art: 'User',
                zugriff: 'DELETE',
                benutzer: 'test-user',
                nummer: '1234',
                von: '2026-01-01',
                bis: ''
              })
            }
          }
        }
      ]
    }).compileComponents();

    const component = createComponent().componentInstance;

    expect(component['actorInput']()).toBe('test-user');
    expect(auditApiMock.searchAuditEntries).toHaveBeenCalledWith(
      {
        entityType: 'User',
        operation: 'DELETE',
        actorUsername: 'test-user',
        businessKey: '1234',
        from: '2026-01-01',
        to: null
      },
      undefined,
      undefined
    );
  });

  it('search() passes the current filter values', () => {
    const component = createComponent().componentInstance;

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
    const component = createComponent().componentInstance;

    component['search'](3);

    expect(auditApiMock.searchAuditEntries).toHaveBeenLastCalledWith(expect.anything(), 3, pagedResponse.pageSize);
  });

  // A slower search's response arriving after a faster, more recent one must never overwrite the
  // list/announcement with a result that no longer matches the URL's filter params. See #3530.
  it('a slower stale search response never overwrites a newer one already applied', () => {
    const firstResponse = new Subject<AuditEntriesResponse>();
    const secondResponse: AuditEntriesResponse = {...pagedResponse, totalCount: 42};

    (auditApiMock.searchAuditEntries as any)
      .mockReturnValueOnce(of(pagedResponse))
      .mockReturnValueOnce(firstResponse)
      .mockReturnValueOnce(of(secondResponse));

    const component = createComponent().componentInstance;

    component['search'](2);
    component['search'](3);

    // The second, faster search has already resolved and been applied by the time the first,
    // slower one finally answers.
    firstResponse.next(pagedResponse);
    firstResponse.complete();

    expect(component['entries']()).toEqual(secondResponse);
    expect(component['searchAnnouncement']()).toBe('42 Einträge gefunden');
  });

  describe('applying a filter', () => {

    it('waits for a typed number to be finished rather than searching per digit', () => {
      const component = createComponent().componentInstance;
      expect(auditApiMock.searchAuditEntries).toHaveBeenCalledTimes(1);

      component['onBusinessKeyInput']('12');
      component['onBusinessKeyInput']('1234');
      vi.advanceTimersByTime(399);
      expect(auditApiMock.searchAuditEntries).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      expect(auditApiMock.searchAuditEntries).toHaveBeenCalledTimes(2);
      expect(auditApiMock.searchAuditEntries).toHaveBeenLastCalledWith(
        expect.objectContaining({businessKey: '1234'}), undefined, pagedResponse.pageSize
      );
    });

    // The filter matches a username exactly, so a half-typed one must not be searched for - an empty
    // result would read as "this user changed nothing".
    it('narrows the offered users while typing, without filtering on what is typed', () => {
      const component = createComponent().componentInstance;

      component['onActorInput']('max');
      vi.advanceTimersByTime(1000);

      expect(component['filteredActors']().map(actor => actor.username)).toEqual(['test-user']);
      expect(component['actorUsername']()).toBeNull();
      expect(auditApiMock.searchAuditEntries).toHaveBeenCalledTimes(1);
    });

    it('filters on a user once one is picked, and stops filtering when the box is emptied', () => {
      const component = createComponent().componentInstance;

      component['onActorSelected']('test-user');
      expect(auditApiMock.searchAuditEntries).toHaveBeenLastCalledWith(
        expect.objectContaining({actorUsername: 'test-user'}), undefined, pagedResponse.pageSize
      );

      component['onActorInput']('');
      expect(component['actorUsername']()).toBeNull();
      expect(auditApiMock.searchAuditEntries).toHaveBeenLastCalledWith(
        expect.objectContaining({actorUsername: null}), undefined, pagedResponse.pageSize
      );
    });

    it('sets both ends of the range from a preset and searches at once', () => {
      const component = createComponent().componentInstance;

      component['applyDatePreset'](component['datePresets'][1]);

      expect(component['from']()).toBe(dayjs().subtract(6, 'day').format('YYYY-MM-DD'));
      expect(component['to']()).toBe(dayjs().format('YYYY-MM-DD'));
      expect(component['activePreset']()).toBe('woche');
      expect(auditApiMock.searchAuditEntries).toHaveBeenCalledTimes(2);
    });

    it('reports no preset while the range is one that none of them describes', () => {
      const component = createComponent().componentInstance;

      expect(component['activePreset']()).toBeNull();

      component['applyDatePreset'](component['datePresets'][0]);
      expect(component['activePreset']()).toBe('heute');
    });
  });

  it('resetFilter() returns to the defaults the screen opens on, not to an empty filter', () => {
    const component = createComponent().componentInstance;

    component['entityType'].set('User');
    component['actorUsername'].set('test-user');
    component['actorInput'].set('test-user');
    component['from'].set('2020-01-01');
    component['resetFilter']();

    expect(component['entityType']()).toBe('Household');
    expect(component['actorUsername']()).toBeNull();
    expect(component['actorInput']()).toBe('');
    expect(component['from']()).toBe(defaultFilter.from);
    expect(component['to']()).toBe(defaultFilter.to);
    expect(auditApiMock.searchAuditEntries).toHaveBeenLastCalledWith(defaultFilter, undefined, pagedResponse.pageSize);
  });

  it('shows an error toast when loading fails', () => {
    auditApiMock.searchAuditEntries = vi.fn(() => throwError(() => new Error('failed')));

    createComponent();

    expect(toastrMock.error).toHaveBeenCalled();
  });

  it('translates entity types and operations into German labels, falling back to the raw key', () => {
    const component = createComponent().componentInstance;

    expect(component['entityTypeLabel']('Household')).toBe('Kunde');
    expect(component['entityTypeLabel']('SomethingNew')).toBe('SomethingNew');
    expect(component['operationLabel']('DELETE')).toBe('Gelöscht');
  });

  it('offers a user by username and name, and by username alone where there is no name', () => {
    const component = createComponent().componentInstance;

    expect(component['actorLabel'](filterOptions.actors[0])).toBe('test-user (Max Mustermann)');
    expect(component['actorLabel'](filterOptions.actors[1])).toBe('other-user');
  });
});
