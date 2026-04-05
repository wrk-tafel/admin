import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {CustomerApiService, CustomerDuplicatesResponse, Gender} from '../../../../api/customer-api.service';
import {CustomerDuplicatesComponent} from './customer-duplicates.component';
import {ActivatedRoute, Router} from '@angular/router';
import moment from 'moment';
import {of, throwError} from 'rxjs';
import {ToastrService} from 'ngx-toastr';
import {CardModule, ColComponent, PaginationModule, RowComponent} from '@coreui/angular';
import {TafelPaginationComponent} from '../../../../common/components/tafel-pagination/tafel-pagination.component';

describe('CustomerDuplicatesComponent', () => {
  let customerApiService: MockedObject<CustomerApiService>;
  let router: MockedObject<Router>;
  let toastr: MockedObject<ToastrService>;

  const mockCustomer1 = {
    id: 133,
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
    gender: Gender.MALE,
    address: {
      street: 'Teststraße',
      houseNumber: '123A',
      door: '21',
      postalCode: 1020,
      city: 'Wien',
    },
    employer: 'test employer',
    income: 1000
  };

  const mockCustomer2 = {
    id: 233,
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
    gender: Gender.MALE,
    address: {
      street: 'Teststraße',
      houseNumber: '123A',
      door: '21',
      postalCode: 1020,
      city: 'Wien',
    },
    employer: 'test employer',
    income: 1000
  };

  const mockCustomer3 = {
    id: 333,
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
    gender: Gender.MALE,
    address: {
      street: 'Teststraße',
      houseNumber: '123A',
      door: '21',
      postalCode: 1020,
      city: 'Wien',
    },
    employer: 'test employer',
    income: 1000
  };

  const mockCustomerDuplicatesDataResponse: CustomerDuplicatesResponse = {
    items: [
      {
        customer: mockCustomer1,
        similarCustomers: [mockCustomer2]
      }
    ],
    totalCount: 100,
    currentPage: 3,
    totalPages: 10,
    pageSize: 10
  };

  beforeEach(() => {
    const customerApiServiceSpy = {
      getCustomerDuplicates: vi.fn().mockName('CustomerApiService.getCustomerDuplicates'),
      deleteCustomer: vi.fn().mockName('CustomerApiService.deleteCustomer'),
      mergeCustomers: vi.fn().mockName('CustomerApiService.mergeCustomers')
    } as any;
    const routerSpy = {
      navigate: vi.fn().mockName('Router.navigate')
    } as any;
    const toastrSpy = {
      error: vi.fn().mockName('ToastrService.error'),
      info: vi.fn().mockName('ToastrService.info'),
      success: vi.fn().mockName('ToastrService.success'),
      warning: vi.fn().mockName('ToastrService.warning')
    } as any;

    TestBed.configureTestingModule({
      imports: [
        CardModule,
        ColComponent,
        RowComponent,
        PaginationModule
      ],
      providers: [
        {
          provide: CustomerApiService,
          useValue: customerApiServiceSpy
        },
        {
          provide: Router,
          useValue: routerSpy
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {
                customerDuplicatesData: mockCustomerDuplicatesDataResponse
              }
            }
          }
        },
        {
          provide: ToastrService,
          useValue: toastrSpy
        }
      ]
    }).compileComponents();

    customerApiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
    router = TestBed.inject(Router) as MockedObject<Router>;
    toastr = TestBed.inject(ToastrService) as MockedObject<ToastrService>;
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('init fills data correctly', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('customerDuplicatesDataInput', mockCustomerDuplicatesDataResponse);
    fixture.detectChanges();

    expect(component.customerDuplicatesData()).toEqual(mockCustomerDuplicatesDataResponse);
    expect(component.paginationData()).toEqual({
      count: mockCustomerDuplicatesDataResponse.items.length,
      totalCount: mockCustomerDuplicatesDataResponse.totalCount,
      currentPage: mockCustomerDuplicatesDataResponse.currentPage,
      totalPages: mockCustomerDuplicatesDataResponse.totalPages,
      pageSize: mockCustomerDuplicatesDataResponse.pageSize
    });
  });

  it('get duplicates with page', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    const page = 5;
    customerApiService.getCustomerDuplicates.mockReturnValue(of(mockCustomerDuplicatesDataResponse));

    component.getDuplicates(page);

    expect(component.customerDuplicatesData()).toEqual(mockCustomerDuplicatesDataResponse);
    expect(component.paginationData()).toEqual({
      count: mockCustomerDuplicatesDataResponse.items.length,
      totalCount: mockCustomerDuplicatesDataResponse.totalCount,
      currentPage: mockCustomerDuplicatesDataResponse.currentPage,
      totalPages: mockCustomerDuplicatesDataResponse.totalPages,
      pageSize: mockCustomerDuplicatesDataResponse.pageSize
    });
  });

  it('show customer detail calls router navigation', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    const customerId = 123;
    component.showCustomerDetail(customerId);

    expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail/' + customerId]);
  });

  it('delete customer failed', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    customerApiService.deleteCustomer.mockReturnValue(throwError(() => {
      return {status: 404};
    }));

    const customerId = 123;
    component.deleteCustomer(customerId);

    expect(customerApiService.deleteCustomer).toHaveBeenCalledWith(customerId);
    expect(toastr.error).toHaveBeenCalledWith('Löschen fehlgeschlagen!');
  });

  it('delete customer successful', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    const customerId = 123;
    customerApiService.deleteCustomer.mockReturnValue(of(null));

    const page = 3;
    component.paginationData.set({
      count: 10,
      totalCount: 100,
      currentPage: page,
      totalPages: 10,
      pageSize: 10
    });
    customerApiService.getCustomerDuplicates.mockReturnValue(of(mockCustomerDuplicatesDataResponse));

    component.deleteCustomer(customerId);

    expect(customerApiService.deleteCustomer).toHaveBeenCalledWith(customerId);
    expect(customerApiService.getCustomerDuplicates).toHaveBeenCalledWith(page);
    expect(toastr.success).toHaveBeenCalledWith('Kunde wurde gelöscht!');
  });

  it('merge customer failed', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    const customerDuplicatesData: CustomerDuplicatesResponse = {
      items: [
        {
          customer: mockCustomer1,
          similarCustomers: [mockCustomer2, mockCustomer3]
        }
      ],
      totalCount: 100,
      currentPage: 3,
      totalPages: 10,
      pageSize: 10
    };
    component.customerDuplicatesData.set(customerDuplicatesData);

    customerApiService.mergeCustomers.mockReturnValue(throwError(() => {
      return {status: 404};
    }));

    component.mergeCustomers(customerDuplicatesData.items[0].customer);

    expect(customerApiService.mergeCustomers).toHaveBeenCalledWith(
      mockCustomer1.id, [mockCustomer2.id, mockCustomer3.id]
    );
    expect(toastr.error).toHaveBeenCalledWith('Zusammenführen der Kunden fehlgeschlagen!');
  });

  it('merge customers successful', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    const customerDuplicatesData: CustomerDuplicatesResponse = {
      items: [
        {
          customer: mockCustomer1,
          similarCustomers: [mockCustomer2, mockCustomer3]
        }
      ],
      totalCount: 100,
      currentPage: 3,
      totalPages: 10,
      pageSize: 10
    };
    component.customerDuplicatesData.set(customerDuplicatesData);

    customerApiService.mergeCustomers.mockReturnValue(of(null));
    customerApiService.getCustomerDuplicates.mockReturnValue(of(mockCustomerDuplicatesDataResponse));

    component.mergeCustomers(mockCustomer1);

    expect(customerApiService.mergeCustomers).toHaveBeenCalledWith(
      mockCustomer1.id, [mockCustomer2.id, mockCustomer3.id]
    );
    expect(customerApiService.getCustomerDuplicates).toHaveBeenCalledWith(1);
    expect(toastr.success).toHaveBeenCalledWith(`2 Kunde(n) wurden gelöscht.`, 'Kunden wurden zusammengeführt!');
  });

});
