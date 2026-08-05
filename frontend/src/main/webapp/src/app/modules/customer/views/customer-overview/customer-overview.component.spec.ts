import {TestBed} from '@angular/core/testing';
import {CustomerApiService, CustomerOverviewItem, CustomerOverviewResponse, Gender} from '../../../../api/customer-api.service';
import {DistributionListResponse} from '../../../../api/distribution-api.service';
import {CustomerOverviewComponent} from './customer-overview.component';
import {Router} from '@angular/router';
import {of} from 'rxjs';
import type {MockedObject} from 'vitest';

describe('CustomerOverviewComponent', () => {
  let customerApiService: MockedObject<CustomerApiService>;
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
      getCustomersOverview: vi.fn().mockName('CustomerApiService.getCustomersOverview')
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
          provide: Router,
          useValue: routerSpy
        }
      ]
    }).compileComponents();

    customerApiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
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

  it('trackByCustomerId returns the customer id', () => {
    const fixture = TestBed.createComponent(CustomerOverviewComponent);
    const component = fixture.componentInstance;

    expect(component.trackByCustomerId(0, mockNewItem)).toEqual(mockNewItem.customer.id);
  });

  it('trackByDistributionId returns the distribution id', () => {
    const fixture = TestBed.createComponent(CustomerOverviewComponent);
    const component = fixture.componentInstance;

    expect(component.trackByDistributionId(0, mockDistributionsResponse.items[0])).toEqual(mockDistributionsResponse.items[0].id);
  });

});
