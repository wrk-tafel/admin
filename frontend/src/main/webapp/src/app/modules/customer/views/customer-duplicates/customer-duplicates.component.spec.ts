import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {CustomerApiService, CustomerDuplicatesResponse, Gender} from '../../../../api/customer-api.service';
import {CustomerDuplicatesComponent} from './customer-duplicates.component';
import {ActivatedRoute, Router} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import dayjs from 'dayjs';
import {of, throwError} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('CustomerDuplicatesComponent', () => {
  let customerApiService: MockedObject<CustomerApiService>;
  let router: MockedObject<Router>;
  let toastr: MockedObject<TafelToastrService>;
  let matDialog: MockedObject<MatDialog>;

  const mockCustomer1 = {
    id: 133,
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: dayjs().subtract(30, 'years').startOf('day').toDate(),
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
    birthDate: dayjs().subtract(30, 'years').startOf('day').toDate(),
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
    birthDate: dayjs().subtract(30, 'years').startOf('day').toDate(),
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
      error: vi.fn().mockName('TafelToastrService.error'),
      info: vi.fn().mockName('TafelToastrService.info'),
      success: vi.fn().mockName('TafelToastrService.success'),
      warning: vi.fn().mockName('TafelToastrService.warning')
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
          provide: TafelToastrService,
          useValue: toastrSpy
        },
        {
          provide: MatDialog,
          useValue: {
            open: vi.fn().mockReturnValue({afterClosed: () => of(true)})
          }
        }
      ]
    }).compileComponents();

    customerApiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
    router = TestBed.inject(Router) as MockedObject<Router>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
    matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('init fills data correctly', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('customerDuplicatesData', mockCustomerDuplicatesDataResponse);
    fixture.detectChanges();

    expect(component.customerDuplicatesData()).toEqual(mockCustomerDuplicatesDataResponse);
  });

  it('get duplicates with page', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    const page = 5;
    customerApiService.getCustomerDuplicates.mockReturnValue(of(mockCustomerDuplicatesDataResponse));

    component.getDuplicates(page);

    expect(component.customerDuplicatesData()).toEqual(mockCustomerDuplicatesDataResponse);
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

    customerApiService.deleteCustomer.mockReturnValue(throwError(() => ({status: 404})));

    const customerId = 123;
    component.openDeleteCustomerDialog(customerId);

    expect(matDialog.open).toHaveBeenCalled();
    expect(customerApiService.deleteCustomer).toHaveBeenCalledWith(customerId);
    expect(toastr.error).toHaveBeenCalledWith('Löschen fehlgeschlagen!');
  });

  it('delete customer successful', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    const customerId = 123;
    customerApiService.deleteCustomer.mockReturnValue(of(undefined));

    const page = 3;
    component.customerDuplicatesData.set({
      items: [],
      totalCount: 100,
      currentPage: page,
      totalPages: 10,
      pageSize: 10
    });
    customerApiService.getCustomerDuplicates.mockReturnValue(of(mockCustomerDuplicatesDataResponse));

    component.openDeleteCustomerDialog(customerId);

    expect(matDialog.open).toHaveBeenCalled();
    expect(customerApiService.deleteCustomer).toHaveBeenCalledWith(customerId);
    expect(customerApiService.getCustomerDuplicates).toHaveBeenCalledWith(page);
    expect(toastr.success).toHaveBeenCalledWith('Kunde wurde gelöscht!');
  });

  it('delete customer does not call the API when the confirmation dialog is cancelled', () => {
    matDialog.open.mockReturnValue({afterClosed: () => of(false)} as any);

    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    component.openDeleteCustomerDialog(123);

    expect(matDialog.open).toHaveBeenCalled();
    expect(customerApiService.deleteCustomer).not.toHaveBeenCalled();
  });

  it('start merge navigates to the merge picker with the remaining pair as sources and the queue position', () => {
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

    component.startMerge(mockCustomer1);

    expect(router.navigate).toHaveBeenCalledWith(
      ['/kunden/zusammenfuehren', mockCustomer1.id],
      {queryParams: {quellen: `${mockCustomer2.id},${mockCustomer3.id}`, seite: 3}}
    );
  });

});
