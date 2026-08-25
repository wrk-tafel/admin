import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, Router} from '@angular/router';
import {HttpErrorResponse, HttpHeaders, HttpResponse} from '@angular/common/http';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {EMPTY, of, throwError} from 'rxjs';

dayjs.extend(customParseFormat);
import {CustomerApiService, CustomerSearchResult, Gender} from '../../../../api/customer-api.service';
import {CustomerSearchComponent} from './customer-search.component';
import {By} from '@angular/platform-browser';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {FileHelperService} from '../../../../common/util/file-helper.service';

describe('CustomerSearchComponent', () => {
  let apiService: MockedObject<CustomerApiService>;
  let router: MockedObject<Router>;
  let toastr: MockedObject<TafelToastrService>;
  let fileHelperService: MockedObject<FileHelperService>;
  let queryParams: Record<string, string>;

  const testCustomer = {
    id: 42,
    firstname: 'first',
    lastname: 'last',
    birthDate: dayjs('10.05.2000', 'DD.MM.YYYY').toDate(),
    gender: Gender.MALE,
    validUntil: dayjs().add(1, 'year').toDate(),
    locked: false,
    address: {
      street: 'street',
      houseNumber: '1',
      stairway: 'stairway1',
      door: '20',
      postalCode: 1010,
      city: 'city'
    },
    additionalPersons: [
      {key: 1, id: 1, firstname: 'child', lastname: 'last', excludeFromHousehold: false, receivesFamilyAllowance: false}
    ],
  };

  const searchCustomerMockResponse: CustomerSearchResult = {
    items: [testCustomer],
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
          provide: CustomerApiService,
          useValue: {
            getCustomer: vi.fn().mockName('CustomerApiService.getCustomer'),
            searchCustomer: vi.fn().mockName('CustomerApiService.searchCustomer'),
            generatePrivacyNoticeTemplate: vi.fn().mockName('CustomerApiService.generatePrivacyNoticeTemplate')
          }
        },
        {
          provide: FileHelperService,
          useValue: {
            downloadFile: vi.fn().mockName('FileHelperService.downloadFile')
          }
        },
        {
          provide: Router,
          useValue: {
            navigate: vi.fn().mockName('Router.navigate').mockResolvedValue(true),
            // the result table's name column is a real link now, and RouterLink builds
            // its href from these two
            createUrlTree: vi.fn().mockName('Router.createUrlTree').mockReturnValue({}),
            serializeUrl: vi.fn().mockName('Router.serializeUrl').mockReturnValue('/kunden/detail/1'),
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
            success: vi.fn().mockName('TafelToastrService.success'),
            warning: vi.fn().mockName('TafelToastrService.warning')
          }
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
    router = TestBed.inject(Router) as MockedObject<Router>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
    fileHelperService = TestBed.inject(FileHelperService) as MockedObject<FileHelperService>;

    // The component searches once as it is constructed, before any test can arrange a response -
    // without a default here every test would fail on the constructor rather than on its subject.
    apiService.searchCustomer.mockReturnValue(EMPTY);
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
    const fixture = TestBed.createComponent(CustomerSearchComponent);
    return {fixture, component: fixture.componentInstance};
  }

  it('component can be created', () => {
    const {component} = createComponent();
    expect(component).toBeTruthy();
  });

  it('loads the first page of customers without being asked to, and stays silent about it', () => {
    apiService.searchCustomer.mockReturnValue(of(searchCustomerMockResponse));

    const {component} = createComponent();

    expect(apiService.searchCustomer)
      .toHaveBeenCalledWith(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined);
    expect(component.searchResult()).toEqual(searchCustomerMockResponse);
    expect(toastr.warning).not.toHaveBeenCalled();
    expect(component.searchAnnouncement()).toBe('');
  });

  it('restores query, filters and page from the URL when returning to the screen', () => {
    queryParams = {suche: 'Muster', unvollstaendig: 'true', seite: '2'};
    TestBed.resetTestingModule();
    configureTestBed();
    apiService.searchCustomer.mockReturnValue(of(searchCustomerMockResponse));

    const {component} = createComponent();

    expect(component.query()).toBe('Muster');
    expect(component.postProcessing()).toBe(true);
    expect(apiService.searchCustomer).toHaveBeenCalledWith('Muster', true, undefined, undefined, undefined, undefined, 2, undefined);
    // A restore must not rewrite the URL that was just used to arrive here.
    expect(router.navigate).not.toHaveBeenCalled();
  });

  describe('the omnibox', () => {

    it('jumps straight to the customer when the query is an exact customer number', () => {
      apiService.getCustomer.mockReturnValue(of(testCustomer as any));
      const {component} = createComponent();

      component.query.set('42');
      component.search();

      expect(apiService.getCustomer).toHaveBeenCalledWith(42, expect.anything());
      expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail', 42]);
    });

    it('falls back to the fuzzy search with the digits as text when no exact customer matches', () => {
      apiService.getCustomer.mockReturnValue(throwError(() => new HttpErrorResponse({status: 404})));
      apiService.searchCustomer.mockReturnValue(of(searchCustomerMockResponse));
      const {component} = createComponent();

      component.query.set('999');
      component.search();

      expect(apiService.searchCustomer)
        .toHaveBeenCalledWith('999', undefined, undefined, undefined, undefined, undefined, undefined, undefined);
      expect(router.navigate).not.toHaveBeenCalledWith(['/kunden/detail', 999]);
    });

    it('reports a real error instead of falling back when the lookup fails for another reason', () => {
      apiService.getCustomer.mockReturnValue(throwError(() => new HttpErrorResponse({status: 500})));
      const {component} = createComponent();
      apiService.searchCustomer.mockClear();

      component.query.set('999');
      component.search();

      expect(toastr.error).toHaveBeenCalledWith('Fehler beim Laden des Kunden!');
      expect(apiService.searchCustomer).not.toHaveBeenCalled();
    });

    it('runs the fuzzy search directly for a non-numeric query', () => {
      apiService.searchCustomer.mockReturnValue(of(searchCustomerMockResponse));
      const {component} = createComponent();

      component.query.set('muster');
      component.search();

      expect(apiService.searchCustomer)
        .toHaveBeenCalledWith('muster', undefined, undefined, undefined, undefined, undefined, undefined, undefined);
      expect(apiService.getCustomer).not.toHaveBeenCalled();
    });

    it('debounces search-as-you-type and waits for at least two characters', () => {
      apiService.searchCustomer.mockReturnValue(of(searchCustomerMockResponse));
      const {component} = createComponent();
      expect(apiService.searchCustomer).toHaveBeenCalledTimes(1);

      component.onQueryInput('m');
      vi.advanceTimersByTime(1000);
      expect(apiService.searchCustomer).toHaveBeenCalledTimes(1);

      component.onQueryInput('mu');
      vi.advanceTimersByTime(299);
      expect(apiService.searchCustomer).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      expect(apiService.searchCustomer).toHaveBeenCalledTimes(2);
      expect(apiService.searchCustomer)
        .toHaveBeenLastCalledWith('mu', undefined, undefined, undefined, undefined, undefined, undefined, undefined);
    });

    it('lets the explicit search bypass the debounce and the two-character threshold', () => {
      apiService.searchCustomer.mockReturnValue(of(searchCustomerMockResponse));
      const {component} = createComponent();

      component.query.set('m');
      component.search();

      expect(apiService.searchCustomer)
        .toHaveBeenLastCalledWith('m', undefined, undefined, undefined, undefined, undefined, undefined, undefined);
    });

    it('an explicit search absorbs the debounced search still pending for the same input', () => {
      apiService.searchCustomer.mockReturnValue(of(searchCustomerMockResponse));
      const {component} = createComponent();
      expect(apiService.searchCustomer).toHaveBeenCalledTimes(1);

      component.onQueryInput('muster');
      component.search();
      expect(apiService.searchCustomer).toHaveBeenCalledTimes(2);

      // the debounce from typing fires afterwards - it must not re-run the identical search and
      // replace the result list underneath the user a moment after the explicit one answered
      vi.advanceTimersByTime(1000);
      expect(apiService.searchCustomer).toHaveBeenCalledTimes(2);
    });
  });

  describe('filters', () => {

    it('toggling a filter chip re-searches without attempting the exact-id jump', () => {
      apiService.getCustomer.mockReturnValue(of(testCustomer as any));
      apiService.searchCustomer.mockReturnValue(of(searchCustomerMockResponse));
      const {component} = createComponent();
      component.query.set('42');

      component.toggleFilter(component.costContribution, true);

      expect(apiService.getCustomer).not.toHaveBeenCalled();
      expect(apiService.searchCustomer)
        .toHaveBeenLastCalledWith('42', undefined, true, undefined, undefined, undefined, undefined, undefined);
    });

    it('search with postProcessing enabled', () => {
      apiService.searchCustomer.mockReturnValue(of(searchCustomerMockResponse));
      const {component} = createComponent();

      component.toggleFilter(component.postProcessing, true);

      expect(apiService.searchCustomer)
        .toHaveBeenLastCalledWith(undefined, true, undefined, undefined, undefined, undefined, undefined, undefined);
    });

    it('search with valid enabled', () => {
      apiService.searchCustomer.mockReturnValue(of(searchCustomerMockResponse));
      const {component} = createComponent();

      component.toggleFilter(component.valid, true);

      expect(apiService.searchCustomer)
        .toHaveBeenLastCalledWith(undefined, undefined, undefined, true, undefined, undefined, undefined, undefined);
    });

    it('search with locked enabled', () => {
      apiService.searchCustomer.mockReturnValue(of(searchCustomerMockResponse));
      const {component} = createComponent();

      component.toggleFilter(component.locked, true);

      expect(apiService.searchCustomer)
        .toHaveBeenLastCalledWith(undefined, undefined, undefined, undefined, true, undefined, undefined, undefined);
    });

    it('search with missingPrivacyNotice enabled', () => {
      apiService.searchCustomer.mockReturnValue(of(searchCustomerMockResponse));
      const {component} = createComponent();

      component.toggleFilter(component.missingPrivacyNotice, true);

      expect(apiService.searchCustomer)
        .toHaveBeenLastCalledWith(undefined, undefined, undefined, undefined, undefined, true, undefined, undefined);
    });
  });

  it('announces the number of results and no longer toasts on an empty result', () => {
    apiService.searchCustomer.mockReturnValue(of({items: [], totalCount: 0, currentPage: 1, totalPages: 0, pageSize: 10}));
    const {component} = createComponent();

    component.query.set('Zzzz Kein Treffer Zzzz');
    component.search();

    expect(component.searchAnnouncement()).toBe('Keine Kunden gefunden');
    expect(component.searchResult()?.items).toEqual([]);
    expect(toastr.warning).not.toHaveBeenCalled();
  });

  it('writes the current query, filters and page back into the URL after a search', () => {
    apiService.searchCustomer.mockReturnValue(of({...searchCustomerMockResponse, currentPage: 2, pageSize: 25}));
    const {component} = createComponent();

    component.query.set('muster');
    component.toggleFilter(component.valid, true);
    component.toggleFilter(component.locked, true);

    expect(router.navigate).toHaveBeenLastCalledWith([], expect.objectContaining({
      queryParams: expect.objectContaining({
        suche: 'muster',
        bezugsberechtigt: 'true',
        gesperrt: 'true',
        seite: 2,
        anzahl: 25
      })
    }));
  });

  describe('the "Kunden anlegen" empty-state CTA', () => {

    it('prefills first and last name from a two-word query', () => {
      const {component} = createComponent();
      component.query.set('Max Mustermann');

      expect(component.createCustomerQueryParams()).toEqual({vorname: 'Max', nachname: 'Mustermann'});
    });

    it('prefills only the last name from a one-word query', () => {
      const {component} = createComponent();
      component.query.set('Mustermann');

      expect(component.createCustomerQueryParams()).toEqual({nachname: 'Mustermann'});
    });

    it('prefills nothing from a numeric query', () => {
      const {component} = createComponent();
      component.query.set('12345');

      expect(component.createCustomerQueryParams()).toEqual({});
    });
  });

  it('navigate to customer', () => {
    const {component} = createComponent();

    component.navigateToCustomer(1);

    expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail', 1]);
  });

  it('edit customer', () => {
    const {component} = createComponent();

    component.editCustomer(1);

    expect(router.navigate).toHaveBeenCalledWith(['/kunden/bearbeiten', 1]);
  });

  it('renders the result row with an edit action and no separate view button', () => {
    apiService.searchCustomer.mockReturnValue(of(searchCustomerMockResponse));
    const {fixture} = createComponent();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="searchresult-id-0"]')).nativeElement.textContent).toBe('42');
    expect(fixture.debugElement.query(By.css('[testid="searchresult-name-0"]')).nativeElement.textContent).toBe('last first');
    expect(fixture.debugElement.query(By.css('[testid="searchresult-editcustomer-button-42"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[testid="searchresult-showcustomer-button-42"]'))).toBeFalsy();
  });

  it('persons count skips persons excluded from the household', () => {
    apiService.searchCustomer.mockReturnValue(of({
      ...searchCustomerMockResponse,
      items: [{
        ...testCustomer,
        additionalPersons: [
          ...testCustomer.additionalPersons,
          {key: 2, id: 2, firstname: 'excluded', lastname: 'last', excludeFromHousehold: true, receivesFamilyAllowance: false}
        ]
      }]
    }));
    const {fixture} = createComponent();
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="searchresult-personsCount-0"]')).nativeElement.textContent).toBe('2');
  });

  it('downloads the reference-less privacy notice template', () => {
    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders({'Content-Disposition': 'inline; filename=datenschutzerklaerung-vorlage.pdf'}),
      body: new Blob()
    });
    apiService.generatePrivacyNoticeTemplate.mockReturnValue(of(response));

    const {component} = createComponent();
    component.downloadPrivacyNoticeTemplate();

    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('datenschutzerklaerung-vorlage.pdf', response.body);
    expect(component.downloadingPrivacyNoticeTemplate()).toBe(false);
  });

});
