import {TestBed} from '@angular/core/testing';
import {HttpHeaders, HttpResponse, provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {MatDialog} from '@angular/material/dialog';
import {of, Subject} from 'rxjs';
import {DataSubjectRequestSearchComponent} from './data-subject-request-search.component';
import {
  DataSubjectDeleteResponse,
  DataSubjectMatchListResponse,
  DataSubjectRequestApiService
} from '../../../../api/data-subject-request-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {AuthenticationService} from '../../../../common/security/authentication.service';
import {FileHelperService} from '../../../../common/util/file-helper.service';

describe('DataSubjectRequestSearchComponent', () => {
  const searchResponse: DataSubjectMatchListResponse = {
    items: [
      {type: 'CUSTOMER', id: 1234, businessKey: '1234', name: 'Mustermann Max'},
      {type: 'USER_ACCOUNT', id: 42, businessKey: 'mmustermann', name: 'Mustermann Max'}
    ],
    truncated: false
  };

  let apiMock: Partial<DataSubjectRequestApiService>;
  let toastrMock: Partial<TafelToastrService>;
  let fileHelperMock: Partial<FileHelperService>;
  let dialogMock: Partial<MatDialog>;
  let permissions: string[];

  beforeEach(() => {
    vi.useFakeTimers();
    permissions = ['CUSTOMER', 'USER_MANAGEMENT', 'SETTINGS'];

    apiMock = {
      search: vi.fn(() => of<DataSubjectMatchListResponse>(searchResponse)),
      exportMatches: vi.fn(),
      deleteMatches: vi.fn()
    };
    toastrMock = {success: vi.fn(), error: vi.fn()};
    fileHelperMock = {downloadFile: vi.fn()};
    dialogMock = {open: vi.fn(() => ({afterClosed: () => of(undefined)})) as any};

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: DataSubjectRequestApiService, useValue: apiMock},
        {provide: TafelToastrService, useValue: toastrMock},
        {provide: FileHelperService, useValue: fileHelperMock},
        {provide: MatDialog, useValue: dialogMock},
        {provide: AuthenticationService, useValue: {hasPermission: (permission: string) => permissions.includes(permission)}}
      ]
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(DataSubjectRequestSearchComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('component can be created', () => {
    expect(createComponent().componentInstance).toBeTruthy();
  });

  it('does not search below the minimum search length', () => {
    const component = createComponent().componentInstance;

    component['onSearchInput']('x');
    vi.advanceTimersByTime(400);

    expect(apiMock.search).not.toHaveBeenCalled();
    expect(component['matches']()).toBeNull();
  });

  it('searches once typing settles and groups the results by type', () => {
    const component = createComponent().componentInstance;

    component['onSearchInput']('Muster');
    vi.advanceTimersByTime(400);

    expect(apiMock.search).toHaveBeenCalledWith('Muster');
    expect(component['groupedMatches']()).toEqual([
      {type: 'CUSTOMER', label: 'Kunde', items: [searchResponse.items[0]]},
      {type: 'USER_ACCOUNT', label: 'Benutzerkonto', items: [searchResponse.items[1]]}
    ]);
  });

  // A slower search's response arriving after a faster, more recent one must never overwrite the
  // result list with matches for a term that is no longer in the search box. See #3530.
  it('a slower stale search response never overwrites a newer one already applied', () => {
    const firstResponse = new Subject<DataSubjectMatchListResponse>();
    const secondResponse: DataSubjectMatchListResponse = {items: [searchResponse.items[1]], truncated: false};

    (apiMock.search as any)
      .mockReturnValueOnce(firstResponse)
      .mockReturnValueOnce(of(secondResponse));

    const component = createComponent().componentInstance;

    component['onSearchInput']('Muster');
    vi.advanceTimersByTime(400);

    component['onSearchInput']('Musterfrau');
    vi.advanceTimersByTime(400);

    // The second, faster search has already resolved and been applied by the time the first,
    // slower one finally answers.
    firstResponse.next(searchResponse);
    firstResponse.complete();

    expect(component['matches']()).toEqual(secondResponse.items);
  });

  it('does not select a match whose area permission is missing', () => {
    permissions = ['CUSTOMER'];
    const component = createComponent().componentInstance;

    component['onSearchInput']('Muster');
    vi.advanceTimersByTime(400);

    component['toggleSelection'](searchResponse.items[1]);

    expect(component['selectedMatches']()).toEqual([]);
  });

  it('exports the selected matches as one combined ZIP', () => {
    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders({'Content-Disposition': 'inline; filename=datenauskunft.zip'}),
      body: new Blob()
    });
    (apiMock.exportMatches as any).mockReturnValue(of(response));

    const component = createComponent().componentInstance;
    component['onSearchInput']('Muster');
    vi.advanceTimersByTime(400);
    component['toggleSelection'](searchResponse.items[0]);
    component['toggleSelection'](searchResponse.items[1]);

    component['exportSelected']();

    expect(apiMock.exportMatches).toHaveBeenCalledWith([
      {type: 'CUSTOMER', id: 1234},
      {type: 'USER_ACCOUNT', id: 42}
    ]);
    expect(fileHelperMock.downloadFile).toHaveBeenCalledWith('datenauskunft.zip', response.body);
  });

  it('removes a deleted match from the results and reports success', () => {
    const deleteResponse: DataSubjectDeleteResponse = {
      results: [{match: {type: 'CUSTOMER', id: 1234}, outcome: 'DELETED'}]
    };
    (apiMock.deleteMatches as any).mockReturnValue(of(deleteResponse));
    (dialogMock.open as any).mockReturnValue({afterClosed: () => of(true)});

    const component = createComponent().componentInstance;
    component['onSearchInput']('Muster');
    vi.advanceTimersByTime(400);
    component['toggleSelection'](searchResponse.items[0]);

    component['deleteSelected']();

    expect(apiMock.deleteMatches).toHaveBeenCalledWith([{type: 'CUSTOMER', id: 1234}]);
    expect(component['matches']()).toEqual([searchResponse.items[1]]);
    expect(toastrMock.success).toHaveBeenCalled();
  });

  it('flags a truncated search result', () => {
    (apiMock.search as any).mockReturnValue(of<DataSubjectMatchListResponse>({...searchResponse, truncated: true}));

    const component = createComponent().componentInstance;
    component['onSearchInput']('Muster');
    vi.advanceTimersByTime(400);

    expect(component['truncated']()).toBe(true);
    expect(component['searchAnnouncement']()).toContain('weitere Treffer werden nicht angezeigt');
  });

  it('reports a not-found match by name rather than only a count', () => {
    const deleteResponse: DataSubjectDeleteResponse = {
      results: [
        {match: {type: 'CUSTOMER', id: 1234}, outcome: 'DELETED'},
        {match: {type: 'USER_ACCOUNT', id: 42}, outcome: 'NOT_FOUND'}
      ]
    };
    (apiMock.deleteMatches as any).mockReturnValue(of(deleteResponse));
    (dialogMock.open as any).mockReturnValue({afterClosed: () => of(true)});

    const component = createComponent().componentInstance;
    component['onSearchInput']('Muster');
    vi.advanceTimersByTime(400);
    component['toggleSelection'](searchResponse.items[0]);
    component['toggleSelection'](searchResponse.items[1]);

    component['deleteSelected']();

    expect(toastrMock.error).toHaveBeenCalledWith(
      expect.stringContaining('Mustermann Max (mmustermann)'),
      'Hinweis'
    );
  });

  it('does not delete anything when the confirmation is cancelled', () => {
    (dialogMock.open as any).mockReturnValue({afterClosed: () => of(undefined)});

    const component = createComponent().componentInstance;
    component['onSearchInput']('Muster');
    vi.advanceTimersByTime(400);
    component['toggleSelection'](searchResponse.items[0]);

    component['deleteSelected']();

    expect(apiMock.deleteMatches).not.toHaveBeenCalled();
  });
});
