import {TestBed, waitForAsync} from '@angular/core/testing';
import {CustomerApiService, CustomerDuplicatesResponse, Gender} from '../../../../api/customer-api.service';
import {CustomerDuplicatesComponent} from './customer-duplicates.component';
import {ActivatedRoute, Router} from '@angular/router';
import * as moment from 'moment/moment';
import {of} from "rxjs";

describe('CustomerDuplicatesComponent', () => {
  let customerApiService: jasmine.SpyObj<CustomerApiService>;
  let router: jasmine.SpyObj<Router>;

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

  beforeEach(waitForAsync(() => {
    const customerApiServiceSpy = jasmine.createSpyObj('CustomerApiService', ['getCustomerDuplicates']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [],
      declarations: [
        CustomerDuplicatesComponent
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
      ]
    }).compileComponents();

    customerApiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('init fills data correctly', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    component.ngOnInit();

    expect(component.customerDuplicatesData).toEqual(mockCustomerDuplicatesDataResponse);
    expect(component.paginationData).toEqual({
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
    customerApiService.getCustomerDuplicates.withArgs(page).and.returnValue(of(mockCustomerDuplicatesDataResponse));

    component.getDuplicates(page);

    expect(component.customerDuplicatesData).toEqual(mockCustomerDuplicatesDataResponse);
    expect(component.paginationData).toEqual({
      count: mockCustomerDuplicatesDataResponse.items.length,
      totalCount: mockCustomerDuplicatesDataResponse.totalCount,
      currentPage: mockCustomerDuplicatesDataResponse.currentPage,
      totalPages: mockCustomerDuplicatesDataResponse.totalPages,
      pageSize: mockCustomerDuplicatesDataResponse.pageSize
    });
  });

  it('showCustomerDetail calls router navigation', () => {
    const fixture = TestBed.createComponent(CustomerDuplicatesComponent);
    const component = fixture.componentInstance;

    const customerId = 123;
    component.showCustomerDetail(customerId);

    expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail/' + customerId]);
  });

});
