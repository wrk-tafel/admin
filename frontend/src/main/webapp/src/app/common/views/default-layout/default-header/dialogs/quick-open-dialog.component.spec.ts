import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {provideRouter, Router} from '@angular/router';
import {provideLocationMocks} from '@angular/common/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {MatDialogRef} from '@angular/material/dialog';
import {HttpHeaders, HttpResponse} from '@angular/common/http';
import {of} from 'rxjs';
import {provideNoopAnimations} from '@angular/platform-browser/animations';

import {flattenNavigationItems, QuickOpenDialogComponent} from './quick-open-dialog.component';
import {ITafelNavData} from '../../navigation-menuItems';
import {AuthenticationService} from '../../../../../common/security/authentication.service';
import {GlobalStateService} from '../../../../../common/state/global-state.service';
import {CustomerApiService, CustomerData} from '../../../../../api/customer-api.service';
import {FileHelperService} from '../../../../../common/util/file-helper.service';

const SEARCH_DEBOUNCE_WAIT_MS = 300;

const testNavItems: ITafelNavData[] = [
  {name: 'Übersicht', url: '/uebersicht'},
  {name: 'Kunden', title: true},
  {name: 'Kunden suchen', url: '/kunden/suchen', permissions: ['CUSTOMER']},
  {name: 'Annahme', url: '/anmeldung/annahme', permissions: ['CHECKIN'], activeDistributionRequired: true},
  {
    name: 'Statistiken',
    permissions: ['STATISTICS'],
    children: [
      {name: 'Allgemein', url: '/statistiken/allgemein'},
      {name: 'Auswertung Kinder', url: '/statistiken/auswertung-kinder'}
    ]
  },
  {
    name: 'Sonstige',
    children: [
      {name: 'Kunden-Duplikate', url: '/kunden/duplikate', permissions: ['CUSTOMER_DUPLICATES']}
    ]
  }
];

describe('flattenNavigationItems', () => {
  const allPermissions = () => true;

  it('skips section titles and keeps plain entries', () => {
    const entries = flattenNavigationItems(testNavItems, allPermissions, true);

    expect(entries.map(entry => entry.label)).not.toContain('Kunden');
    expect(entries).toContainEqual(expect.objectContaining({label: 'Übersicht', url: '/uebersicht'}));
  });

  it('filters entries by permission', () => {
    const entries = flattenNavigationItems(testNavItems, permission => permission !== 'CUSTOMER', true);

    expect(entries.map(entry => entry.url)).not.toContain('/kunden/suchen');
  });

  it('flattens children with the group name as prefix', () => {
    const entries = flattenNavigationItems(testNavItems, allPermissions, true);

    expect(entries).toContainEqual(
      expect.objectContaining({label: 'Statistiken › Allgemein', url: '/statistiken/allgemein'})
    );
    expect(entries).toContainEqual(
      expect.objectContaining({label: 'Statistiken › Auswertung Kinder', url: '/statistiken/auswertung-kinder'})
    );
  });

  it('a child inherits its group permission requirement', () => {
    const entries = flattenNavigationItems(testNavItems, permission => permission !== 'STATISTICS', true);

    expect(entries.map(entry => entry.url)).not.toContain('/statistiken/allgemein');
  });

  it('a child with its own permission is filtered individually', () => {
    const withDuplicates = flattenNavigationItems(testNavItems, allPermissions, true);
    const withoutDuplicates = flattenNavigationItems(testNavItems, permission => permission !== 'CUSTOMER_DUPLICATES', true);

    expect(withDuplicates.map(entry => entry.url)).toContain('/kunden/duplikate');
    expect(withoutDuplicates.map(entry => entry.url)).not.toContain('/kunden/duplikate');
  });

  it('excludes entries requiring an active distribution while none is running', () => {
    const active = flattenNavigationItems(testNavItems, allPermissions, true);
    const inactive = flattenNavigationItems(testNavItems, allPermissions, false);

    expect(active.map(entry => entry.url)).toContain('/anmeldung/annahme');
    expect(inactive.map(entry => entry.url)).not.toContain('/anmeldung/annahme');
  });
});

describe('QuickOpenDialogComponent', () => {
  let authenticationService: MockedObject<AuthenticationService>;
  let customerApiService: MockedObject<CustomerApiService>;
  let fileHelperService: MockedObject<FileHelperService>;
  let dialogRef: MockedObject<MatDialogRef<QuickOpenDialogComponent>>;
  let router: Router;

  const testCustomer: CustomerData = {
    id: 133,
    lastname: 'Mustermann',
    firstname: 'Max',
    address: {street: 'Teststraße', houseNumber: '12', postalCode: 1010, city: 'Wien'}
  } as CustomerData;

  const searchResult = (items: CustomerData[]) =>
    of({items, totalCount: items.length, currentPage: 1, totalPages: 1, pageSize: 5});

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([]),
        provideLocationMocks(),
        provideNoopAnimations(),
        {
          provide: AuthenticationService,
          useValue: {
            hasPermission: vi.fn().mockName('AuthenticationService.hasPermission').mockReturnValue(true)
          }
        },
        {
          provide: GlobalStateService,
          useValue: {
            getCurrentDistribution: vi.fn().mockName('GlobalStateService.getCurrentDistribution')
              .mockReturnValue(signal(null).asReadonly())
          }
        },
        {
          provide: CustomerApiService,
          useValue: {
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
          provide: MatDialogRef,
          useValue: {
            close: vi.fn().mockName('MatDialogRef.close')
          }
        }
      ]
    }).compileComponents();

    authenticationService = TestBed.inject(AuthenticationService) as MockedObject<AuthenticationService>;
    customerApiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
    fileHelperService = TestBed.inject(FileHelperService) as MockedObject<FileHelperService>;
    dialogRef = TestBed.inject(MatDialogRef) as MockedObject<MatDialogRef<QuickOpenDialogComponent>>;
    router = TestBed.inject(Router);
  });

  it('shows all permitted navigation entries for an empty query', () => {
    const fixture = TestBed.createComponent(QuickOpenDialogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.navResults().length).toBeGreaterThan(0);
    expect(component.navResults().map(entry => entry.url)).toContain('/uebersicht');
  });

  it('filters navigation entries by the query, case-insensitively', () => {
    const fixture = TestBed.createComponent(QuickOpenDialogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.query.set('fahrzeuge');
    fixture.detectChanges();

    expect(component.navResults().map(entry => entry.url)).toEqual(['/einstellungen/fahrzeuge']);
  });

  it('hides navigation entries the user has no permission for', () => {
    authenticationService.hasPermission.mockImplementation(permission => permission !== 'SETTINGS');
    const fixture = TestBed.createComponent(QuickOpenDialogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.query.set('Fahrzeuge');
    fixture.detectChanges();

    expect(component.navResults()).toEqual([]);
  });

  it('opening a navigation entry navigates and closes the dialog', () => {
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl');
    const fixture = TestBed.createComponent(QuickOpenDialogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.openNavEntry({label: 'Übersicht', url: '/uebersicht'});

    expect(dialogRef.close).toHaveBeenCalled();
    expect(navigateByUrl).toHaveBeenCalledWith('/uebersicht');
  });

  it('opening a customer navigates to its detail page and closes the dialog', () => {
    const navigate = vi.spyOn(router, 'navigate');
    const fixture = TestBed.createComponent(QuickOpenDialogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.openCustomer(testCustomer);

    expect(dialogRef.close).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/kunden/detail', 133]);
  });

  it('searches customers after the debounce once the query has two characters', async () => {
    customerApiService.searchCustomer.mockReturnValue(searchResult([testCustomer]));
    const fixture = TestBed.createComponent(QuickOpenDialogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.query.set('Muster');
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, SEARCH_DEBOUNCE_WAIT_MS));
    fixture.detectChanges();

    expect(customerApiService.searchCustomer).toHaveBeenCalledWith('Muster', null, null, null, null, null, null, undefined, 5);
    expect(component.customerResults()).toEqual([testCustomer]);
  });

  it('does not search customers below two characters', async () => {
    const fixture = TestBed.createComponent(QuickOpenDialogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.query.set('M');
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, SEARCH_DEBOUNCE_WAIT_MS));

    expect(customerApiService.searchCustomer).not.toHaveBeenCalled();
    expect(component.customerResults()).toBeNull();
  });

  it('does not search customers without the CUSTOMER permission', async () => {
    authenticationService.hasPermission.mockImplementation(permission => permission !== 'CUSTOMER');
    const fixture = TestBed.createComponent(QuickOpenDialogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.query.set('Muster');
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, SEARCH_DEBOUNCE_WAIT_MS));

    expect(customerApiService.searchCustomer).not.toHaveBeenCalled();
    expect(component.customerResults()).toBeNull();
  });

  it('shows the privacy notice template action for an empty query', () => {
    const fixture = TestBed.createComponent(QuickOpenDialogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.showPrivacyNoticeTemplateAction()).toBe(true);
  });

  it('filters the privacy notice template action out for a non-matching query', () => {
    const fixture = TestBed.createComponent(QuickOpenDialogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.query.set('fahrzeuge');
    fixture.detectChanges();

    expect(component.showPrivacyNoticeTemplateAction()).toBe(false);
  });

  it('hides the privacy notice template action without the CUSTOMER permission', () => {
    authenticationService.hasPermission.mockImplementation(permission => permission !== 'CUSTOMER');
    const fixture = TestBed.createComponent(QuickOpenDialogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.showPrivacyNoticeTemplateAction()).toBe(false);
  });

  it('downloads the privacy notice template and closes the dialog', () => {
    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders({'Content-Disposition': 'inline; filename=datenschutzerklaerung-vorlage.pdf'}),
      body: new Blob()
    });
    customerApiService.generatePrivacyNoticeTemplate.mockReturnValue(of(response));
    const fixture = TestBed.createComponent(QuickOpenDialogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.downloadPrivacyNoticeTemplate();

    expect(dialogRef.close).toHaveBeenCalled();
    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('datenschutzerklaerung-vorlage.pdf', response.body);
  });

  it('announces the result counts for the screen reader status region', async () => {
    customerApiService.searchCustomer.mockReturnValue(searchResult([testCustomer]));
    const fixture = TestBed.createComponent(QuickOpenDialogComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.resultAnnouncement()).not.toContain('Kunden');
    expect(component.resultAnnouncement()).toContain('1 Aktion');

    component.query.set('Muster');
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, SEARCH_DEBOUNCE_WAIT_MS));
    fixture.detectChanges();

    expect(component.resultAnnouncement()).toContain('1 Kunden');
  });
});
