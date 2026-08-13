import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, Router} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {EMPTY, of, throwError} from 'rxjs';
import {UserApiService, UserData, UserSearchResult} from '../../../../api/user-api.service';
import {UserSearchComponent} from './user-search.component';
import {By} from '@angular/platform-browser';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('UserSearchComponent', () => {
  let apiService: MockedObject<UserApiService>;
  let router: MockedObject<Router>;
  let toastr: MockedObject<TafelToastrService>;
  let queryParams: Record<string, string>;

  const testUser: UserData = {
    id: 42,
    personnelNumber: '12345',
    username: 'muster',
    firstname: 'first',
    lastname: 'last',
    enabled: true,
    passwordChangeRequired: false,
    permissions: []
  };

  const searchUserMockResponse: UserSearchResult = {
    items: [testUser],
    totalCount: 1,
    currentPage: 1,
    totalPages: 1,
    pageSize: 10
  };

  function configureTestBed() {
    TestBed.configureTestingModule({
      providers: [
        provideNoopAnimations(),
        {
          provide: UserApiService,
          useValue: {
            getUserForPersonnelNumber: vi.fn().mockName('UserApiService.getUserForPersonnelNumber'),
            searchUser: vi.fn().mockName('UserApiService.searchUser')
          }
        },
        {
          provide: Router,
          useValue: {
            navigate: vi.fn().mockName('Router.navigate').mockResolvedValue(true),
            // the result table's name column is a real link now, and RouterLink builds
            // its href from these two
            createUrlTree: vi.fn().mockName('Router.createUrlTree').mockReturnValue({}),
            serializeUrl: vi.fn().mockName('Router.serializeUrl').mockReturnValue('/benutzer/detail/1'),
            events: EMPTY
          }
        },
        {
          provide: ActivatedRoute,
          useValue: {snapshot: {queryParamMap: convertToParamMap(queryParams)}}
        },
        {
          provide: TafelToastrService,
          useValue: {
            error: vi.fn().mockName('TafelToastrService.error'),
            info: vi.fn().mockName('TafelToastrService.info'),
            success: vi.fn().mockName('TafelToastrService.success'),
            warning: vi.fn().mockName('TafelToastrService.warning')
          }
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
    router = TestBed.inject(Router) as MockedObject<Router>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;

    // The component searches once as it is constructed, before any test can arrange a response -
    // without a default here every test would fail on the constructor rather than on its subject.
    apiService.searchUser.mockReturnValue(EMPTY);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    queryParams = {};
    configureTestBed();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(UserSearchComponent);
    return {fixture, component: fixture.componentInstance};
  }

  it('component can be created', () => {
    const {component} = createComponent();
    expect(component).toBeTruthy();
  });

  it('loads the first page of active users without being asked to, and stays silent about it', () => {
    apiService.searchUser.mockReturnValue(of(searchUserMockResponse));

    const {component} = createComponent();

    expect(apiService.searchUser).toHaveBeenCalledWith(undefined, true, undefined, undefined);
    expect(component.searchResult()).toEqual(searchUserMockResponse);
    expect(toastr.info).not.toHaveBeenCalled();
    expect(component.searchAnnouncement()).toBe('');
  });

  it('restores query, status and page from the URL when returning to the screen', () => {
    queryParams = {suche: 'Muster', status: 'deaktiviert', seite: '2'};
    TestBed.resetTestingModule();
    configureTestBed();
    apiService.searchUser.mockReturnValue(of(searchUserMockResponse));

    const {component} = createComponent();

    expect(component.query()).toBe('Muster');
    expect(component.statusFilter()).toBe('deaktiviert');
    expect(apiService.searchUser).toHaveBeenCalledWith('Muster', false, 2, undefined);
    // A restore must not rewrite the URL that was just used to arrive here.
    expect(router.navigate).not.toHaveBeenCalled();
  });

  describe('the omnibox', () => {

    it('jumps straight to the user when the query is an exact personnel-number match', () => {
      apiService.getUserForPersonnelNumber.mockReturnValue(of(testUser));
      const {component} = createComponent();

      component.query.set('12345');
      component.search();

      expect(apiService.getUserForPersonnelNumber).toHaveBeenCalledWith('12345', expect.anything());
      expect(router.navigate).toHaveBeenCalledWith(['/benutzer/detail', 42]);
    });

    it('falls back to the fuzzy search with the digits as text when no exact personnel number matches', () => {
      apiService.getUserForPersonnelNumber.mockReturnValue(throwError(() => new HttpErrorResponse({status: 404})));
      apiService.searchUser.mockReturnValue(of(searchUserMockResponse));
      const {component} = createComponent();

      component.query.set('999');
      component.search();

      expect(apiService.searchUser).toHaveBeenCalledWith('999', true, undefined, undefined);
      expect(router.navigate).not.toHaveBeenCalledWith(['/benutzer/detail', 999]);
    });

    it('reports a real error instead of falling back when the lookup fails for another reason', () => {
      apiService.getUserForPersonnelNumber.mockReturnValue(throwError(() => new HttpErrorResponse({status: 500})));
      const {component} = createComponent();
      apiService.searchUser.mockClear();

      component.query.set('999');
      component.search();

      expect(toastr.error).toHaveBeenCalledWith('Fehler beim Laden des Benutzers!');
      expect(apiService.searchUser).not.toHaveBeenCalled();
    });

    it('runs the fuzzy search directly for a non-numeric query', () => {
      apiService.searchUser.mockReturnValue(of(searchUserMockResponse));
      const {component} = createComponent();

      component.query.set('muster');
      component.search();

      expect(apiService.searchUser).toHaveBeenCalledWith('muster', true, undefined, undefined);
      expect(apiService.getUserForPersonnelNumber).not.toHaveBeenCalled();
    });

    it('debounces search-as-you-type and waits for at least two characters', () => {
      apiService.searchUser.mockReturnValue(of(searchUserMockResponse));
      const {component} = createComponent();
      expect(apiService.searchUser).toHaveBeenCalledTimes(1);

      component.onQueryInput('m');
      vi.advanceTimersByTime(1000);
      expect(apiService.searchUser).toHaveBeenCalledTimes(1);

      component.onQueryInput('mu');
      vi.advanceTimersByTime(299);
      expect(apiService.searchUser).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      expect(apiService.searchUser).toHaveBeenCalledTimes(2);
      expect(apiService.searchUser).toHaveBeenLastCalledWith('mu', true, undefined, undefined);
    });

    it('lets the explicit search bypass the debounce and the two-character threshold', () => {
      apiService.searchUser.mockReturnValue(of(searchUserMockResponse));
      const {component} = createComponent();

      component.query.set('m');
      component.search();

      expect(apiService.searchUser).toHaveBeenLastCalledWith('m', true, undefined, undefined);
    });
  });

  describe('the status filter', () => {

    it('selecting a status chip re-searches without attempting the exact-match jump', () => {
      apiService.getUserForPersonnelNumber.mockReturnValue(of(testUser));
      apiService.searchUser.mockReturnValue(of(searchUserMockResponse));
      const {component} = createComponent();
      component.query.set('12345');

      component.onStatusFilterChange('deaktiviert', {selected: true, isUserInput: true} as any);

      expect(apiService.getUserForPersonnelNumber).not.toHaveBeenCalled();
      expect(apiService.searchUser).toHaveBeenLastCalledWith('12345', false, undefined, undefined);
    });

    it('maps "Alle" to no enabled filter at all', () => {
      apiService.searchUser.mockReturnValue(of(searchUserMockResponse));
      const {component} = createComponent();

      component.onStatusFilterChange('alle', {selected: true, isUserInput: true} as any);

      expect(apiService.searchUser).toHaveBeenLastCalledWith(undefined, undefined, undefined, undefined);
    });

    it('ignores the deselect event fired for the option losing selection', () => {
      apiService.searchUser.mockReturnValue(of(searchUserMockResponse));
      const {component} = createComponent();
      apiService.searchUser.mockClear();

      component.onStatusFilterChange('aktiv', {selected: false, isUserInput: true} as any);

      expect(component.statusFilter()).toBe('aktiv');
      expect(apiService.searchUser).not.toHaveBeenCalled();
    });

    /**
     * `mat-chip-option` fires `selectionChange` for *any* change to its `selected` property
     * binding, not just a click - including the chip listbox's own first render, when the default
     * status's `[selected]` binding first goes from its own internal `false` to `true`.
     * `isUserInput` is what actually distinguishes a real click from that - see the component KDoc.
     */
    it('ignores a programmatic selection change (e.g. the initial render binding)', () => {
      apiService.searchUser.mockReturnValue(of(searchUserMockResponse));
      const {component} = createComponent();
      apiService.searchUser.mockClear();

      component.onStatusFilterChange('deaktiviert', {selected: true, isUserInput: false} as any);

      expect(component.statusFilter()).toBe('aktiv');
      expect(apiService.searchUser).not.toHaveBeenCalled();
    });
  });

  it('announces the number of results and no longer toasts on an empty result', () => {
    apiService.searchUser.mockReturnValue(of({items: [], totalCount: 0, currentPage: 1, totalPages: 0, pageSize: 10}));
    const {component} = createComponent();

    component.query.set('Zzzz Kein Treffer Zzzz');
    component.search();

    expect(component.searchAnnouncement()).toBe('Keine Benutzer gefunden');
    expect(component.searchResult()?.items).toEqual([]);
    expect(toastr.info).not.toHaveBeenCalled();
  });

  it('writes the current query, status and page back into the URL after a search', () => {
    apiService.searchUser.mockReturnValue(of({...searchUserMockResponse, currentPage: 2, pageSize: 25}));
    const {component} = createComponent();

    component.query.set('muster');
    component.onStatusFilterChange('deaktiviert', {selected: true, isUserInput: true} as any);

    expect(router.navigate).toHaveBeenLastCalledWith([], expect.objectContaining({
      queryParams: expect.objectContaining({
        suche: 'muster',
        status: 'deaktiviert',
        seite: 2,
        anzahl: 25
      })
    }));
  });

  it('omits the status param from the URL for the default "Aktiv" filter', () => {
    apiService.searchUser.mockReturnValue(of(searchUserMockResponse));
    const {component} = createComponent();

    component.query.set('muster');
    component.search();

    expect(router.navigate).toHaveBeenLastCalledWith([], expect.objectContaining({
      queryParams: expect.objectContaining({status: null})
    }));
  });

  it('navigate to user', () => {
    const {component} = createComponent();

    component.navigateToUserDetail(1);

    expect(router.navigate).toHaveBeenCalledWith(['/benutzer/detail', 1]);
  });

  it('edit user', () => {
    const {component} = createComponent();

    component.editUser(1);

    expect(router.navigate).toHaveBeenCalledWith(['/benutzer/bearbeiten', 1]);
  });

  describe('isLocked', () => {
    it('is false without a lockedUntil', () => {
      const {component} = createComponent();
      expect(component.isLocked({...testUser, lockedUntil: undefined})).toBe(false);
    });

    it('is true while lockedUntil is in the future', () => {
      const {component} = createComponent();
      const future = new Date(Date.now() + 60_000).toISOString();
      expect(component.isLocked({...testUser, lockedUntil: future})).toBe(true);
    });

    it('is false once lockedUntil is in the past', () => {
      const {component} = createComponent();
      const past = new Date(Date.now() - 60_000).toISOString();
      expect(component.isLocked({...testUser, lockedUntil: past})).toBe(false);
    });
  });

  it('renders the result row with an edit action, its status chips, and no separate view button', () => {
    apiService.searchUser.mockReturnValue(of({
      ...searchUserMockResponse,
      items: [{...testUser, passwordChangeRequired: true, lockedUntil: new Date(Date.now() + 60_000).toISOString()}]
    }));
    const {fixture} = createComponent();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="searchresult-id-0"]')).nativeElement.textContent).toBe('42');
    expect(fixture.debugElement.query(By.css('[testid="searchresult-name-0"]')).nativeElement.textContent).toBe('last first');
    expect(fixture.debugElement.query(By.css('[testid="searchresult-enabled-0"]')).nativeElement.textContent).toBe('Aktiv');
    expect(fixture.debugElement.query(By.css('[testid="searchresult-passwordchangerequired-0"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[testid="searchresult-lockeduntil-0"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[testid="searchresult-edituser-button-42"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[testid="searchresult-showuser-button-42"]'))).toBeFalsy();
  });

});
