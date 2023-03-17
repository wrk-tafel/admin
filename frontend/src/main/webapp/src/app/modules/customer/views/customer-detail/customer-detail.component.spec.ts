import {HttpHeaders, HttpResponse} from '@angular/common/http';
import {TestBed, waitForAsync} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {ActivatedRoute, Router} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import * as moment from 'moment';
import {of, throwError} from 'rxjs';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {CustomerApiService, CustomerData} from '../../../../api/customer-api.service';
import {CustomerDetailComponent} from './customer-detail.component';
import {CommonModule, registerLocaleData} from '@angular/common';
import {DEFAULT_CURRENCY_CODE, LOCALE_ID} from '@angular/core';
import localeDeAt from '@angular/common/locales/de-AT';
import {ModalModule} from 'ngx-bootstrap/modal';

registerLocaleData(localeDeAt);

describe('CustomerDetailComponent', () => {
  let apiService: jasmine.SpyObj<CustomerApiService>;
  let fileHelperService: jasmine.SpyObj<FileHelperService>;
  let router: jasmine.SpyObj<Router>;

  const mockCountry = {
    id: 0,
    code: 'AT',
    name: 'Österreich'
  };
  const mockCustomer: CustomerData = {
    id: 133,
    issuer: {
      personnelNumber: '12345',
      firstname: 'first',
      lastname: 'last'
    },
    issuedAt: moment().startOf('day').utc().toDate(),
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
    country: mockCountry,
    telephoneNumber: '00436644123123123',
    email: 'max.mustermann@gmail.com',

    address: {
      street: 'Teststraße',
      houseNumber: '123A',
      stairway: '1',
      door: '21',
      postalCode: 1020,
      city: 'Wien',
    },

    employer: 'test employer',
    income: 1000,
    incomeDue: moment().add(1, 'years').startOf('day').utc().toDate(),

    validUntil: moment().add(1, 'years').startOf('day').utc().toDate(),

    additionalPersons: [
      {
        key: 0,
        id: 0,
        lastname: 'Add',
        firstname: 'Pers 1',
        birthDate: moment().subtract(5, 'years').startOf('day').utc().toDate(),
        income: 50,
        incomeDue: moment().add(1, 'years').startOf('day').utc().toDate(),
        country: mockCountry
      },
      {
        key: 1,
        id: 1,
        lastname: 'Add',
        firstname: 'Pers 2',
        birthDate: moment().subtract(10, 'years').startOf('day').utc().toDate(),
        country: mockCountry
      }
    ]
  };

  beforeEach(waitForAsync(() => {
    const apiServiceSpy = jasmine.createSpyObj('CustomerApiService', ['getCustomer', 'generatePdf', 'deleteCustomer', 'updateCustomer']);
    const fileHelperServiceSpy = jasmine.createSpyObj('FileHelperService', ['downloadFile']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [CommonModule, RouterTestingModule, ModalModule],
      providers: [
        {
          provide: LOCALE_ID,
          useValue: 'de-AT'
        },
        {
          provide: DEFAULT_CURRENCY_CODE,
          useValue: 'EUR'
        },
        {
          provide: CustomerApiService,
          useValue: apiServiceSpy
        },
        {
          provide: FileHelperService,
          useValue: fileHelperServiceSpy
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {
                customerData: mockCustomer
              }
            }
          }
        },
        {
          provide: Router,
          useValue: routerSpy
        }
      ],
      declarations: [CustomerDetailComponent]
    }).compileComponents();

    apiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
    fileHelperService = TestBed.inject(FileHelperService) as jasmine.SpyObj<FileHelperService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('initial data loaded and shown correctly', waitForAsync(() => {
    apiService.getCustomer.withArgs(mockCustomer.id).and.returnValue(of(mockCustomer));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();

    expect(component.customerData).toEqual(mockCustomer);

    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testId="customerIdText"]')).nativeElement.textContent).toBe('133');
    expect(fixture.debugElement.query(By.css('[testId="nameText"]')).nativeElement.textContent).toBe('Mustermann Max');

    const birthDateAge = moment(mockCustomer.birthDate).format('DD.MM.YYYY') + ' (' + moment().diff(mockCustomer.birthDate, 'years') + ')';
    expect(fixture.debugElement.query(By.css('[testId="birthDateAgeText"]')).nativeElement.textContent).toBe(birthDateAge);
    expect(fixture.debugElement.query(By.css('[testId="countryText"]')).nativeElement.textContent).toBe('Österreich');
    expect(fixture.debugElement.query(By.css('[testId="telephoneNumberText"]')).nativeElement.textContent).toBe('00436644123123123');
    expect(fixture.debugElement.query(By.css('[testId="emailText"]')).nativeElement.textContent).toBe('max.mustermann@gmail.com');
    expect(fixture.debugElement.query(By.css('[testId="addressLine1Text"]')).nativeElement.textContent).toBe('Teststraße 123A, Stiege 1, Top 21');
    expect(fixture.debugElement.query(By.css('[testId="addressLine2Text"]')).nativeElement.textContent).toBe('1020 Wien');
    expect(fixture.debugElement.query(By.css('[testId="employerText"]')).nativeElement.textContent).toBe('test employer');
    expect(fixture.debugElement.query(By.css('[testId="incomeText"]')).nativeElement.textContent).toBe('€ 1.000,00');
    expect(fixture.debugElement.query(By.css('[testId="incomeDueText"]')).nativeElement.textContent)
      .toBe(moment(mockCustomer.incomeDue).format('DD.MM.YYYY'));
    expect(fixture.debugElement.query(By.css('[testId="validUntilText"]')).nativeElement.textContent)
      .toBe(moment(mockCustomer.validUntil).format('DD.MM.yyyy'));
    expect(fixture.debugElement.query(By.css('[testId="issuedInformation"]')).nativeElement.textContent)
      .toBe('am ' + moment(mockCustomer.issuedAt).format('DD.MM.YYYY') + ' von 12345 first last');

    // TODO check additional persons
  }));

  it('printMasterdata', waitForAsync(() => {
    apiService.getCustomer.withArgs(mockCustomer.id).and.returnValue(of(mockCustomer));

    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders(
        {'Content-Disposition': 'inline; filename=test-name-1.pdf'}
      ),
      body: new ArrayBuffer(10)
    });
    apiService.generatePdf.withArgs(mockCustomer.id, 'MASTERDATA').and.returnValue(of(response));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();

    component.printMasterdata();

    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('test-name-1.pdf', new Blob([response.body], {type: 'application/pdf'}));
  }));

  it('printIdCard', waitForAsync(() => {
    apiService.getCustomer.withArgs(mockCustomer.id).and.returnValue(of(mockCustomer));

    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders(
        {'Content-Disposition': 'inline; filename=test-name-1.pdf'}
      ),
      body: new ArrayBuffer(10)
    });
    apiService.generatePdf.withArgs(mockCustomer.id, 'IDCARD').and.returnValue(of(response));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();

    component.printIdCard();

    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('test-name-1.pdf', new Blob([response.body], {type: 'application/pdf'}));
  }));

  it('printCombined', waitForAsync(() => {
    apiService.getCustomer.withArgs(mockCustomer.id).and.returnValue(of(mockCustomer));

    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders(
        {'Content-Disposition': 'inline; filename=test-name-1.pdf'}
      ),
      body: new ArrayBuffer(10)
    });
    apiService.generatePdf.withArgs(mockCustomer.id, 'COMBINED').and.returnValue(of(response));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();

    component.printCombined();

    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('test-name-1.pdf', new Blob([response.body], {type: 'application/pdf'}));
  }));

  it('editCustomer', waitForAsync(() => {
    apiService.getCustomer.withArgs(mockCustomer.id).and.returnValue(of(mockCustomer));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();

    component.editCustomer();

    expect(router.navigate).toHaveBeenCalledWith(['/kunden/bearbeiten', mockCustomer.id]);
  }));

  it('isValid with date yesterday is not valid', waitForAsync(() => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.customerData = {
      ...mockCustomer,
      validUntil: moment().subtract(1, 'days').toDate()
    };

    const valid = component.isValid();

    expect(valid).toBeFalse();
  }));

  it('isValid with date today is valid', waitForAsync(() => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.customerData = {
      ...mockCustomer,
      validUntil: moment().toDate()
    };

    const valid = component.isValid();

    expect(valid).toBeTrue();
  }));

  it('isValid with date tomorrow is valid', waitForAsync(() => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.customerData = {
      ...mockCustomer,
      validUntil: moment().add(1, 'days').toDate()
    };

    const valid = component.isValid();
    expect(valid).toBeTrue();

    // TODO expect(incomeDueText)-class success or danger
  }));

  it('delete customer successful', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.customerData = mockCustomer;

    apiService.deleteCustomer.and.returnValue(of(null));

    component.deleteCustomer();

    expect(apiService.deleteCustomer).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/kunden/suchen']);
  });

  it('delete customer failed', () => {
    const modal = jasmine.createSpyObj('Modal', ['hide']);

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.deleteCustomerModal = modal;
    component.customerData = mockCustomer;

    apiService.deleteCustomer.and.returnValue(throwError({status: 404}));

    component.deleteCustomer();

    expect(apiService.deleteCustomer).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalledWith(['/kunden/suchen']);
    expect(modal.hide).toHaveBeenCalled();
    expect(component.errorMessage).toBe('Löschen fehlgeschlagen!');
  });

  it('prolong customer', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.customerData = mockCustomer;

    const expectedCustomerData = {
      ...mockCustomer,
      validUntil: moment(mockCustomer.validUntil).add(3, 'months').toDate()
    };
    apiService.updateCustomer.and.returnValue(of(expectedCustomerData));

    component.prolongCustomer(3);

    expect(apiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData);
    expect(component.customerData).toEqual(expectedCustomerData);
  });

});
