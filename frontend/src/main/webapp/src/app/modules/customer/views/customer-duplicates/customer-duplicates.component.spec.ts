import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {CustomerApiService, CustomerData, CustomerDuplicatesResponse, Gender} from '../../../../api/customer-api.service';
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

  const mockCustomer1: CustomerData = {
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

  const mockCustomer2: CustomerData = {
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

  const mockCustomer3: CustomerData = {
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
      dismissDuplicate: vi.fn().mockName('CustomerApiService.dismissDuplicate'),
      mergeCustomers: vi.fn().mockName('CustomerApiService.mergeCustomers')
    } as any;
    const routerSpy = {
      navigate: vi.fn().mockName('Router.navigate')
    } as any;
    const toastrSpy = {
      error: vi.fn().mockName('TafelToastrService.error'),
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

  it('total groups label pluralizes correctly', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    component.customerDuplicatesData.set({...mockCustomerDuplicatesDataResponse, totalCount: 1});
    expect((component as any).totalGroupsLabel()).toBe('1 mögliches Duplikat');

    component.customerDuplicatesData.set({...mockCustomerDuplicatesDataResponse, totalCount: 5});
    expect((component as any).totalGroupsLabel()).toBe('5 mögliche Duplikate');
  });

  it('field differs detects a mismatch between candidates', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    const item = {
      customer: mockCustomer1,
      similarCustomers: [{...mockCustomer2, address: {...mockCustomer2.address, street: 'Andere Straße'}}]
    };

    const addressField = (component as any).comparisonFields.find((field: any) => field.key === 'address');
    expect(component.fieldDiffers(item, addressField)).toBe(true);

    const birthDateField = (component as any).comparisonFields.find((field: any) => field.key === 'birthDate');
    expect(component.fieldDiffers(item, birthDateField)).toBe(false);
  });

  it('person count includes additional persons but skips persons excluded from the household', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    expect(component.personCount(mockCustomer1)).toBe(1);
    expect(component.personCount({...mockCustomer1, additionalPersons: [{} as any, {} as any]})).toBe(3);
    expect(component.personCount({
      ...mockCustomer1,
      additionalPersons: [{} as any, {excludeFromHousehold: true} as any]
    })).toBe(2);
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

    component.openDeleteCustomerDialog(mockCustomer1);

    expect(matDialog.open).toHaveBeenCalledWith(expect.anything(), {data: {customerName: 'Mustermann Max'}});
    expect(customerApiService.deleteCustomer).toHaveBeenCalledWith(mockCustomer1.id);
    expect(toastr.error).toHaveBeenCalledWith('Löschen fehlgeschlagen!');
  });

  it('delete customer successful', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

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

    component.openDeleteCustomerDialog(mockCustomer1);

    expect(matDialog.open).toHaveBeenCalled();
    expect(customerApiService.deleteCustomer).toHaveBeenCalledWith(mockCustomer1.id);
    expect(customerApiService.getCustomerDuplicates).toHaveBeenCalledWith(page);
    expect(toastr.success).toHaveBeenCalledWith('Kunde wurde gelöscht!');
  });

  it('delete customer does not call the API when the confirmation dialog is cancelled', () => {
    matDialog.open.mockReturnValue({afterClosed: () => of(false)} as any);

    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    component.openDeleteCustomerDialog(mockCustomer1);

    expect(matDialog.open).toHaveBeenCalled();
    expect(customerApiService.deleteCustomer).not.toHaveBeenCalled();
  });

  it('dismiss duplicate successful marks the pair and refetches the current page', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    customerApiService.dismissDuplicate.mockReturnValue(of(undefined));

    const page = 3;
    component.customerDuplicatesData.set({
      items: [],
      totalCount: 100,
      currentPage: page,
      totalPages: 10,
      pageSize: 10
    });
    customerApiService.getCustomerDuplicates.mockReturnValue(of(mockCustomerDuplicatesDataResponse));

    component.dismissDuplicate(mockCustomer1, mockCustomer2);

    expect(customerApiService.dismissDuplicate).toHaveBeenCalledWith(mockCustomer1.id, mockCustomer2.id);
    expect(customerApiService.getCustomerDuplicates).toHaveBeenCalledWith(page);
    expect(toastr.success).toHaveBeenCalledWith('Als "kein Duplikat" markiert!');
  });

  it('dismiss duplicate failed shows an error', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    customerApiService.dismissDuplicate.mockReturnValue(throwError(() => ({status: 500})));

    component.dismissDuplicate(mockCustomer1, mockCustomer2);

    expect(toastr.error).toHaveBeenCalledWith('Markieren fehlgeschlagen!');
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
