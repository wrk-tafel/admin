import {TestBed} from '@angular/core/testing';
import {CustomerAboveLimitItem, CustomerAboveLimitResponse, CustomerApiService, Gender} from '../../../../api/customer-api.service';
import {CustomerAboveLimitComponent} from './customer-above-limit.component';
import {Router} from '@angular/router';
import {of} from 'rxjs';
import type {MockedObject} from 'vitest';

describe('CustomerAboveLimitComponent', () => {
  let customerApiService: MockedObject<CustomerApiService>;
  let router: MockedObject<Router>;

  const mockItem: CustomerAboveLimitItem = {
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
    totalSum: 1500,
    limit: 1000,
    amountExceededLimit: 500
  };

  const mockCustomerAboveLimitResponse: CustomerAboveLimitResponse = {
    items: [mockItem],
    totalCount: 100,
    currentPage: 3,
    totalPages: 10,
    pageSize: 25
  };

  beforeEach(() => {
    const customerApiServiceSpy = {
      getCustomersAboveLimit: vi.fn().mockName('CustomerApiService.getCustomersAboveLimit')
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
    const fixture = TestBed.createComponent(CustomerAboveLimitComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('input fills data correctly', () => {
    const fixture = TestBed.createComponent(CustomerAboveLimitComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('customerAboveLimitData', mockCustomerAboveLimitResponse);
    fixture.detectChanges();

    expect(component.customerAboveLimitData()).toEqual(mockCustomerAboveLimitResponse);
  });

  it('get above limit with page', () => {
    const fixture = TestBed.createComponent(CustomerAboveLimitComponent);
    const component = fixture.componentInstance;

    const page = 5;
    customerApiService.getCustomersAboveLimit.mockReturnValue(of(mockCustomerAboveLimitResponse));

    component.getAboveLimit(page);

    expect(customerApiService.getCustomersAboveLimit).toHaveBeenCalledWith(page);
    expect(component.customerAboveLimitData()).toEqual(mockCustomerAboveLimitResponse);
  });

  it('get above limit with no results sets data to undefined', () => {
    const fixture = TestBed.createComponent(CustomerAboveLimitComponent);
    const component = fixture.componentInstance;

    customerApiService.getCustomersAboveLimit.mockReturnValue(of({
      items: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 0,
      pageSize: 25
    }));

    component.getAboveLimit(1);

    expect(component.customerAboveLimitData()).toBeUndefined();
  });

  it('show customer detail calls router navigation', () => {
    const fixture = TestBed.createComponent(CustomerAboveLimitComponent);
    const component = fixture.componentInstance;

    const customerId = 123;
    component.showCustomerDetail(customerId);

    expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail', customerId]);
  });

  it('trackByCustomerId returns the customer id', () => {
    const fixture = TestBed.createComponent(CustomerAboveLimitComponent);
    const component = fixture.componentInstance;

    expect(component.trackByCustomerId(0, mockItem)).toEqual(mockItem.customer.id);
  });

});
