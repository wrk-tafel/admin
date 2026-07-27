import {TestBed} from '@angular/core/testing';
import {CustomerAboveLimitItem, Gender} from '../../../../api/customer-api.service';
import {CustomerAboveLimitComponent} from './customer-above-limit.component';
import {Router} from '@angular/router';
import type {MockedObject} from 'vitest';

describe('CustomerAboveLimitComponent', () => {
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

  beforeEach(() => {
    const routerSpy = {
      navigate: vi.fn().mockName('Router.navigate')
    } as any;

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: routerSpy
        }
      ]
    }).compileComponents();

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
    fixture.componentRef.setInput('customerAboveLimitData', [mockItem]);
    fixture.detectChanges();

    expect(component.customerAboveLimitData()).toEqual([mockItem]);
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
