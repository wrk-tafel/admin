import {TestBed} from '@angular/core/testing';
import {HttpHeaders, HttpResponse, provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {CustomerAboveLimitItem, CustomerAboveLimitResponse, CustomerApiService, Gender} from '../../../../api/customer-api.service';
import {CustomerAboveLimitComponent} from './customer-above-limit.component';
import {of} from 'rxjs';
import type {MockedObject} from 'vitest';
import {FileHelperService} from '../../../../common/util/file-helper.service';

describe('CustomerAboveLimitComponent', () => {
  let customerApiService: MockedObject<CustomerApiService>;
  let fileHelperService: MockedObject<FileHelperService>;

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
    amountExceededLimit: 500,
    percentageExceededLimit: 50
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
      getCustomersAboveLimit: vi.fn().mockName('CustomerApiService.getCustomersAboveLimit'),
      generateCustomersAboveLimitCsv: vi.fn().mockName('CustomerApiService.generateCustomersAboveLimitCsv')
    } as any;
    const fileHelperServiceSpy = {
      downloadFile: vi.fn().mockName('FileHelperService.downloadFile')
    } as any;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: CustomerApiService,
          useValue: customerApiServiceSpy
        },
        {
          provide: FileHelperService,
          useValue: fileHelperServiceSpy
        }
      ]
    }).compileComponents();

    customerApiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
    fileHelperService = TestBed.inject(FileHelperService) as MockedObject<FileHelperService>;
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

  it('get above limit with page uses the current sort state', () => {
    const fixture = TestBed.createComponent(CustomerAboveLimitComponent);
    const component = fixture.componentInstance;

    const page = 5;
    customerApiService.getCustomersAboveLimit.mockReturnValue(of(mockCustomerAboveLimitResponse));

    component.getAboveLimit(page);

    // defaults to the backend's own default sort (amountExceededLimit, desc) until a header is clicked
    expect(customerApiService.getCustomersAboveLimit).toHaveBeenCalledWith(page, undefined, 'amountExceededLimit', 'desc');
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

  it('sorting reloads the first page with the newly selected sort', () => {
    const fixture = TestBed.createComponent(CustomerAboveLimitComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('customerAboveLimitData', mockCustomerAboveLimitResponse);
    fixture.detectChanges();

    customerApiService.getCustomersAboveLimit.mockReturnValue(of(mockCustomerAboveLimitResponse));

    component.onSortChange({active: 'totalSum', direction: 'asc'});

    expect(customerApiService.getCustomersAboveLimit).toHaveBeenCalledWith(1, mockCustomerAboveLimitResponse.pageSize, 'totalSum', 'asc');
  });

  it('clearing the sort direction falls back to descending rather than no sort', () => {
    const fixture = TestBed.createComponent(CustomerAboveLimitComponent);
    const component = fixture.componentInstance;
    customerApiService.getCustomersAboveLimit.mockReturnValue(of(mockCustomerAboveLimitResponse));

    component.onSortChange({active: 'limit', direction: ''});

    expect(customerApiService.getCustomersAboveLimit).toHaveBeenCalledWith(1, undefined, 'limit', 'desc');
  });

  it('generates and downloads the csv export for the current sort', () => {
    const fixture = TestBed.createComponent(CustomerAboveLimitComponent);
    const component = fixture.componentInstance;

    const blob = new Blob(['csv-content']);
    customerApiService.generateCustomersAboveLimitCsv.mockReturnValue(of(
      new HttpResponse({
        body: blob,
        headers: new HttpHeaders({'content-disposition': 'inline; filename=kunden_ueber_limit_13.08.2026.csv'})
      })
    ));

    component['generateCsv']();

    expect(customerApiService.generateCustomersAboveLimitCsv).toHaveBeenCalledWith('amountExceededLimit', 'desc');
    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('kunden_ueber_limit_13.08.2026.csv', blob);
  });

  it('a household with no valid-until date is neither valid nor invalid', () => {
    const fixture = TestBed.createComponent(CustomerAboveLimitComponent);
    const component = fixture.componentInstance;

    expect(component['isValid']({...mockItem, customer: {...mockItem.customer, validUntil: undefined}})).toBe(false);
  });

  it('bar width caps at 100 even when the percentage exceeds it', () => {
    const fixture = TestBed.createComponent(CustomerAboveLimitComponent);
    const component = fixture.componentInstance;

    expect(component['barWidth']({...mockItem, percentageExceededLimit: 240})).toBe(100);
    expect(component['barWidth']({...mockItem, percentageExceededLimit: 30})).toBe(30);
  });

  it('trackByCustomerId returns the customer id', () => {
    const fixture = TestBed.createComponent(CustomerAboveLimitComponent);
    const component = fixture.componentInstance;

    expect(component.trackByCustomerId(0, mockItem)).toEqual(mockItem.customer.id);
  });

});
