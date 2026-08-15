import {TestBed} from '@angular/core/testing';
import {CustomerApiService, CustomerOverviewItem, CustomerOverviewResponse, Gender} from '../../../../api/customer-api.service';
import {DistributionListResponse} from '../../../../api/distribution-api.service';
import {CustomerOverviewComponent} from './customer-overview.component';
import {Router} from '@angular/router';
import {HttpHeaders, HttpResponse} from '@angular/common/http';
import {of} from 'rxjs';
import type {MockedObject} from 'vitest';
import {FileHelperService} from '../../../../common/util/file-helper.service';

describe('CustomerOverviewComponent', () => {
  let customerApiService: MockedObject<CustomerApiService>;
  let fileHelperService: MockedObject<FileHelperService>;
  let router: MockedObject<Router>;

  const mockNewItem: CustomerOverviewItem = {
    customer: {
      id: 133,
      lastname: 'Mustermann',
      firstname: 'Max',
      gender: Gender.MALE,
      address: {
        street: 'Teststraße',
        houseNumber: '123A',
        door: '21',
        postalCode: 1020,
        city: 'Wien',
      },
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      additionalPersons: [
        {key: 1, id: 1, firstname: 'Erika', lastname: 'Mustermann', excludeFromHousehold: false, receivesFamilyAllowance: false}
      ]
    },
    date: new Date('2026-01-01')
  };

  const mockRenewedItem: CustomerOverviewItem = {
    customer: {
      id: 134,
      lastname: 'Musterfrau',
      firstname: 'Maria',
      gender: Gender.FEMALE,
      address: {
        street: 'Teststraße',
        houseNumber: '124',
        postalCode: 1020,
        city: 'Wien',
      },
      locked: true
    },
    date: new Date('2026-01-02')
  };

  const mockCustomerOverviewResponse: CustomerOverviewResponse = {
    distributionId: 100,
    newCustomers: [mockNewItem],
    renewedCustomers: [mockRenewedItem]
  };

  const mockDistributionsResponse: DistributionListResponse = {
    items: [
      {id: 100, startedAt: new Date('2026-01-01')},
      {id: 99, startedAt: new Date('2025-12-24')}
    ]
  };

  beforeEach(() => {
    const customerApiServiceSpy = {
      getCustomersOverview: vi.fn().mockName('CustomerApiService.getCustomersOverview'),
      generateCustomersOverviewCsv: vi.fn().mockName('CustomerApiService.generateCustomersOverviewCsv')
    } as any;
    const fileHelperServiceSpy = {
      downloadFile: vi.fn().mockName('FileHelperService.downloadFile')
    } as any;
    const routerSpy = {
      navigate: vi.fn().mockName('Router.navigate')
    } as any;

    TestBed.configureTestingModule({
      providers: [
        {
          provide: CustomerApiService,
          useValue: customerApiServiceSpy
        },
        {
          provide: FileHelperService,
          useValue: fileHelperServiceSpy
        },
        {
          provide: Router,
          useValue: routerSpy
        }
      ]
    }).compileComponents();

    customerApiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
    fileHelperService = TestBed.inject(FileHelperService) as MockedObject<FileHelperService>;
    router = TestBed.inject(Router) as MockedObject<Router>;
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(CustomerOverviewComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('input fills data correctly', () => {
    const fixture = TestBed.createComponent(CustomerOverviewComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('customerOverviewData', mockCustomerOverviewResponse);
    fixture.componentRef.setInput('distributionsData', mockDistributionsResponse);
    fixture.detectChanges();

    expect(component.customerOverviewData()).toEqual(mockCustomerOverviewResponse);
    expect(component.distributionsDataInput()).toEqual(mockDistributionsResponse);
    expect(component.selectedDistributionId()).toEqual(100);
  });

  it('selecting a distribution reloads the overview data', () => {
    const fixture = TestBed.createComponent(CustomerOverviewComponent);
    const component = fixture.componentInstance;

    const otherDistributionResponse: CustomerOverviewResponse = {
      distributionId: 99,
      newCustomers: [],
      renewedCustomers: []
    };
    customerApiService.getCustomersOverview.mockReturnValue(of(otherDistributionResponse));

    component.onDistributionSelected(99);

    expect(customerApiService.getCustomersOverview).toHaveBeenCalledWith(99);
    expect(component.selectedDistributionId()).toEqual(99);
    expect(component.customerOverviewData()).toEqual(otherDistributionResponse);
  });

  it('show customer detail calls router navigation', () => {
    const fixture = TestBed.createComponent(CustomerOverviewComponent);
    const component = fixture.componentInstance;

    const customerId = 123;
    component.showCustomerDetail(customerId);

    expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail', customerId]);
  });

  it('trackByRow returns the row customer id', () => {
    const fixture = TestBed.createComponent(CustomerOverviewComponent);
    const component = fixture.componentInstance;

    expect(component.trackByRow(0, {type: 'NEW', item: mockNewItem})).toEqual(mockNewItem.customer.id);
  });

  it('trackByDistributionId returns the distribution id', () => {
    const fixture = TestBed.createComponent(CustomerOverviewComponent);
    const component = fixture.componentInstance;

    expect(component.trackByDistributionId(0, mockDistributionsResponse.items[0])).toEqual(mockDistributionsResponse.items[0].id);
  });

  describe('counts and merged/filtered rows', () => {
    it('counts new and renewed customers separately', () => {
      const fixture = TestBed.createComponent(CustomerOverviewComponent);
      const component = fixture.componentInstance;
      fixture.componentRef.setInput('customerOverviewData', mockCustomerOverviewResponse);
      fixture.detectChanges();

      expect(component.newCount()).toEqual(1);
      expect(component.renewedCount()).toEqual(1);
    });

    it('filters the merged list by type', () => {
      const fixture = TestBed.createComponent(CustomerOverviewComponent);
      const component = fixture.componentInstance;
      fixture.componentRef.setInput('customerOverviewData', mockCustomerOverviewResponse);
      fixture.detectChanges();

      expect(component.filteredRows()).toHaveLength(2);

      component.selectedFilter.set('NEW');
      expect(component.filteredRows()).toEqual([{type: 'NEW', item: mockNewItem}]);

      component.selectedFilter.set('RENEWED');
      expect(component.filteredRows()).toEqual([{type: 'RENEWED', item: mockRenewedItem}]);
    });
  });

  describe('persons count and validity', () => {
    it('counts the main person plus every additional person not excluded from the household', () => {
      const fixture = TestBed.createComponent(CustomerOverviewComponent);
      const component = fixture.componentInstance;

      expect(component.personsCount(mockNewItem.customer)).toEqual(2);
      expect(component.personsCount(mockRenewedItem.customer)).toEqual(1);
      expect(component.personsCount({
        ...mockNewItem.customer,
        additionalPersons: [
          ...mockNewItem.customer.additionalPersons!,
          {excludeFromHousehold: true} as any
        ]
      })).toEqual(2);
    });

    it('treats a household with a future validUntil and no lock as valid', () => {
      const fixture = TestBed.createComponent(CustomerOverviewComponent);
      const component = fixture.componentInstance;

      expect(component.isCustomerValid(mockNewItem.customer)).toBe(true);
      expect(component.validityLabel(mockNewItem.customer)).toEqual('Gültig');
    });

    it('treats a locked household as invalid regardless of validUntil', () => {
      const fixture = TestBed.createComponent(CustomerOverviewComponent);
      const component = fixture.componentInstance;

      expect(component.isCustomerValid(mockRenewedItem.customer)).toBe(false);
      expect(component.validityLabel(mockRenewedItem.customer)).toEqual('Gesperrt');
    });

    it('treats a household with a past validUntil as invalid', () => {
      const fixture = TestBed.createComponent(CustomerOverviewComponent);
      const component = fixture.componentInstance;

      const expiredCustomer = {...mockNewItem.customer, validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000)};

      expect(component.isCustomerValid(expiredCustomer)).toBe(false);
      expect(component.validityLabel(expiredCustomer)).toEqual('Ungültig');
    });
  });

  describe('distribution navigation', () => {
    it('steps to the older distribution and back to the newer one', () => {
      const fixture = TestBed.createComponent(CustomerOverviewComponent);
      const component = fixture.componentInstance;
      fixture.componentRef.setInput('customerOverviewData', mockCustomerOverviewResponse);
      fixture.componentRef.setInput('distributionsData', mockDistributionsResponse);
      fixture.detectChanges();

      customerApiService.getCustomersOverview.mockReturnValue(of({distributionId: 99, newCustomers: [], renewedCustomers: []}));

      expect(component.canGoToOlderDistribution()).toBe(true);
      component.goToOlderDistribution();

      expect(customerApiService.getCustomersOverview).toHaveBeenCalledWith(99);
      expect(component.selectedDistributionId()).toEqual(99);
      expect(component.canGoToOlderDistribution()).toBe(false);
      expect(component.canGoToNewerDistribution()).toBe(true);

      customerApiService.getCustomersOverview.mockReturnValue(of(mockCustomerOverviewResponse));
      component.goToNewerDistribution();

      expect(customerApiService.getCustomersOverview).toHaveBeenCalledWith(100);
      expect(component.selectedDistributionId()).toEqual(100);
    });

    it('cannot go newer from the newest distribution', () => {
      const fixture = TestBed.createComponent(CustomerOverviewComponent);
      const component = fixture.componentInstance;
      fixture.componentRef.setInput('customerOverviewData', mockCustomerOverviewResponse);
      fixture.componentRef.setInput('distributionsData', mockDistributionsResponse);
      fixture.detectChanges();

      expect(component.canGoToNewerDistribution()).toBe(false);

      component.goToNewerDistribution();

      expect(customerApiService.getCustomersOverview).not.toHaveBeenCalled();
      expect(component.selectedDistributionId()).toEqual(100);
    });

    it('disables both arrows when no distribution has been closed yet', () => {
      const fixture = TestBed.createComponent(CustomerOverviewComponent);
      const component = fixture.componentInstance;
      fixture.componentRef.setInput('customerOverviewData', {distributionId: null, newCustomers: [], renewedCustomers: []});
      fixture.componentRef.setInput('distributionsData', {items: []});
      fixture.detectChanges();

      expect(component.selectedDistributionId()).toBeUndefined();
      expect(component.canGoToNewerDistribution()).toBe(false);
      expect(component.canGoToOlderDistribution()).toBe(false);
    });
  });

  it('exports the overview as csv and downloads the returned file', () => {
    const fixture = TestBed.createComponent(CustomerOverviewComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('customerOverviewData', mockCustomerOverviewResponse);
    fixture.detectChanges();

    const blob = new Blob(['Typ;Nr.']);
    const response = new HttpResponse({
      body: blob,
      headers: new HttpHeaders({'content-disposition': 'inline; filename=kunden-uebersicht_2026-01-01.csv'})
    });
    customerApiService.generateCustomersOverviewCsv.mockReturnValue(of(response));

    component.exportCsv();

    expect(customerApiService.generateCustomersOverviewCsv).toHaveBeenCalledWith(100);
    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('kunden-uebersicht_2026-01-01.csv', blob);
  });

});
