import {HttpHeaders, HttpResponse} from '@angular/common/http';
import {ComponentFixture, TestBed, waitForAsync} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {ActivatedRoute, Router} from '@angular/router';
import * as moment from 'moment';
import {of, throwError} from 'rxjs';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {CustomerApiService, CustomerData} from '../../../../api/customer-api.service';
import {CustomerDetailComponent} from './customer-detail.component';
import {CommonModule} from '@angular/common';
import {DEFAULT_CURRENCY_CODE, LOCALE_ID} from '@angular/core';
import {CustomerNoteApiService, CustomerNoteItem} from '../../../../api/customer-note-api.service';
import {
  CardModule,
  ColComponent,
  DropdownComponent,
  ModalModule,
  NavComponent,
  NavItemComponent,
  RowComponent,
  TabsModule
} from '@coreui/angular';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {ToastService, ToastType} from '../../../../common/views/default-layout/toasts/toast.service';

describe('CustomerDetailComponent', () => {
  let customerApiService: jasmine.SpyObj<CustomerApiService>;
  let customerNoteApiService: jasmine.SpyObj<CustomerNoteApiService>;
  let fileHelperService: jasmine.SpyObj<FileHelperService>;
  let router: jasmine.SpyObj<Router>;
  let toastService: jasmine.SpyObj<ToastService>;

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
        employer: 'test employer 2',
        income: 50,
        incomeDue: moment().add(1, 'years').startOf('day').utc().toDate(),
        country: mockCountry,
        excludeFromHousehold: false,
        receivesFamilyBonus: true
      },
      {
        key: 1,
        id: 1,
        lastname: 'Add',
        firstname: 'Pers 2',
        birthDate: moment().subtract(10, 'years').startOf('day').utc().toDate(),
        country: mockCountry,
        excludeFromHousehold: true,
        receivesFamilyBonus: false
      }
    ]
  };
  const mockNotes = [
    {
      author: 'author1',
      timestamp: moment('2023-03-22T19:45:25.615477+01:00').toDate(),
      note: 'note from author 2'
    },
    {
      author: 'author2',
      timestamp: moment('2023-03-20T19:45:25.615477+01:00').toDate(),
      note: 'note from author 1'
    }
  ];

  beforeEach(waitForAsync(() => {
    const customerApiServiceSpy = jasmine.createSpyObj('CustomerApiService', ['generatePdf', 'deleteCustomer', 'updateCustomer']);
    const customerNoteApiServiceSpy = jasmine.createSpyObj('CustomerNoteApiService', ['createNewNote']);
    const fileHelperServiceSpy = jasmine.createSpyObj('FileHelperService', ['downloadFile']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const toastServiceSpy = jasmine.createSpyObj('ToastService', ['showToast']);

    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        CommonModule,
        ModalModule,
        TabsModule,
        DropdownComponent,
        NavComponent,
        NavItemComponent,
        CardModule,
        ColComponent,
        RowComponent
      ],
      declarations: [
        CustomerDetailComponent
      ],
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
          useValue: customerApiServiceSpy
        },
        {
          provide: CustomerNoteApiService,
          useValue: customerNoteApiServiceSpy
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
                customerData: mockCustomer,
                customerNotes: mockNotes
              }
            }
          }
        },
        {
          provide: Router,
          useValue: routerSpy
        },
        {
          provide: ToastService,
          useValue: toastServiceSpy
        }
      ]
    }).compileComponents();

    customerApiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
    customerNoteApiService = TestBed.inject(CustomerNoteApiService) as jasmine.SpyObj<CustomerNoteApiService>;
    fileHelperService = TestBed.inject(FileHelperService) as jasmine.SpyObj<FileHelperService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('initial data loaded and shown correctly', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.customerData).toEqual(mockCustomer);
    expect(component.customerNotes).toEqual(mockNotes);

    expect(getTextByTestId(fixture, 'customerIdText')).toBe('133');
    expect(getTextByTestId(fixture, 'nameText')).toBe('Mustermann Max');

    const birthDateAge = moment(mockCustomer.birthDate).format('DD.MM.YYYY') + ' (' + moment().diff(mockCustomer.birthDate, 'years') + ')';
    expect(getTextByTestId(fixture, 'birthDateAgeText')).toBe(birthDateAge);
    expect(getTextByTestId(fixture, 'countryText')).toBe('Österreich');
    expect(getTextByTestId(fixture, 'telephoneNumberText')).toBe('00436644123123123');
    expect(getTextByTestId(fixture, 'emailText')).toBe('max.mustermann@gmail.com');
    expect(getTextByTestId(fixture, 'addressLine1Text')).toBe('Teststraße 123A, Stiege 1, Top 21');
    expect(getTextByTestId(fixture, 'addressLine2Text')).toBe('1020 Wien');
    expect(getTextByTestId(fixture, 'employerText')).toBe('test employer');
    expect(getTextByTestId(fixture, 'incomeText')).toBe('€ 1.000,00');

    expect(getTextByTestId(fixture, 'incomeDueText')).toBe(moment(mockCustomer.incomeDue).format('DD.MM.YYYY'));
    expect(getTextByTestId(fixture, 'validUntilText')).toBe(moment(mockCustomer.validUntil).format('DD.MM.yyyy'));
    expect(getTextByTestId(fixture, 'issuedInformation')).toBe('am ' + moment(mockCustomer.issuedAt).format('DD.MM.YYYY') + ' von 12345 first last');

    expect(getTextByTestId(fixture, 'addperson-0-lastnameText')).toBe('Add');
    expect(getTextByTestId(fixture, 'addperson-0-firstnameText')).toBe('Pers 1');

    // TODO fix
    /*
    const birthDateAgePers1 = moment(mockCustomer.additionalPersons[0].birthDate).format('DD.MM.YYYY') +
      ' (' + moment().diff(mockCustomer.additionalPersons[0].birthDate, 'years') + ')';
    expect(getTextByTestId(fixture, 'addperson-0-birthDateAgeText')).toBe(birthDateAgePers1);
     */

    expect(getTextByTestId(fixture, 'addperson-0-countryText')).toBe('Österreich');
    expect(getTextByTestId(fixture, 'addperson-0-employerText')).toBe('test employer 2');
    expect(getTextByTestId(fixture, 'addperson-0-incomeText')).toBe('€ 50,00');

    // TODO fix
    /*
    expect(getTextByTestId(fixture, 'addperson-0-incomeDueText'))
      .toBe(moment(mockCustomer.additionalPersons[0].incomeDue).format('DD.MM.YYYY'));
    expect(getTextByTestId(fixture, 'addperson-1-incomeText')).toBe('-');
    expect(getTextByTestId(fixture, 'addperson-1-incomeDueText')).toBe('-');
     */

    // validate note
    const expectedTimestamp = moment(mockNotes[0].timestamp).format('DD.MM.YYYY HH:mm');
    expect(getTextByTestId(fixture, 'note-title')).toBe(expectedTimestamp + ' author1');

    // TODO fix flaky assert
    // expect(getTextByTestId(fixture, 'note-text')).toBe('note from author 2');
  });

  it('printMasterdata', () => {
    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders(
        {'Content-Disposition': 'inline; filename=test-name-1.pdf'}
      ),
      body: new Blob()
    });
    customerApiService.generatePdf.withArgs(mockCustomer.id, 'MASTERDATA').and.returnValue(of(response));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();
    fixture.detectChanges();

    component.printMasterdata();

    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('test-name-1.pdf', response.body);
  });

  it('printIdCard', () => {
    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders(
        {'Content-Disposition': 'inline; filename=test-name-1.pdf'}
      ),
      body: new Blob()
    });
    customerApiService.generatePdf.withArgs(mockCustomer.id, 'IDCARD').and.returnValue(of(response));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();
    fixture.detectChanges();

    component.printIdCard();

    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('test-name-1.pdf', response.body);
  });

  it('printCombined', () => {
    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders(
        {'Content-Disposition': 'inline; filename=test-name-1.pdf'}
      ),
      body: new Blob()
    });
    customerApiService.generatePdf.withArgs(mockCustomer.id, 'COMBINED').and.returnValue(of(response));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();
    fixture.detectChanges();

    component.printCombined();

    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('test-name-1.pdf', response.body);
  });

  it('editCustomer', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();
    fixture.detectChanges();

    component.editCustomer();

    expect(router.navigate).toHaveBeenCalledWith(['/kunden/bearbeiten', mockCustomer.id]);
  });

  it('isValid with date of yesterday results in false', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.customerData = {
      ...mockCustomer,
      validUntil: moment().subtract(1, 'days').toDate()
    };

    const valid = component.isValid();

    fixture.detectChanges();
    expect(valid).toBeFalsy();
  });

  it('isValid with date of today results in true', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.customerData = {
      ...mockCustomer,
      validUntil: moment().toDate()
    };
    fixture.detectChanges();

    const valid = component.isValid();

    expect(valid).toBeTrue();
  });

  it('isValid with date of tomorrow results in true', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.customerData = {
      ...mockCustomer,
      validUntil: moment().add(1, 'days').toDate()
    };
    fixture.detectChanges();

    const valid = component.isValid();
    expect(valid).toBeTrue();

    // TODO expect(incomeDueText)-class success or danger
  });

  it('delete customer successful', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.customerData = mockCustomer;
    fixture.detectChanges();

    customerApiService.deleteCustomer.and.returnValue(of(null));

    component.deleteCustomer();

    expect(customerApiService.deleteCustomer).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/kunden/suchen']);
  });

  it('delete customer failed', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.showDeleteCustomerModal = true;
    component.customerData = mockCustomer;
    fixture.detectChanges();

    customerApiService.deleteCustomer.and.returnValue(throwError(() => {
      return {status: 404};
    }));

    component.deleteCustomer();

    expect(customerApiService.deleteCustomer).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalledWith(['/kunden/suchen']);
    expect(component.showDeleteCustomerModal).toBeFalsy();
    expect(toastService.showToast).toHaveBeenCalledWith({type: ToastType.ERROR, title: 'Löschen fehlgeschlagen!'});
  });

  it('prolong customer', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.customerData = mockCustomer;
    fixture.detectChanges();

    const expectedCustomerData = {
      ...mockCustomer,
      validUntil: moment(mockCustomer.validUntil).add(3, 'months').endOf('day').toDate()
    };
    customerApiService.updateCustomer.and.returnValue(of(expectedCustomerData));

    component.prolongCustomer(3);

    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData);
    expect(component.customerData).toEqual(expectedCustomerData);
  });

  it('invalidate customer', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.customerData = mockCustomer;
    fixture.detectChanges();

    const expectedCustomerData = {
      ...mockCustomer,
      validUntil: moment().subtract(1, 'day').endOf('day').toDate()
    };
    customerApiService.updateCustomer.and.returnValue(of(expectedCustomerData));

    component.invalidateCustomer();

    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData);
    expect(component.customerData).toEqual(expectedCustomerData);
  });

  it('lock customer', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.customerData = mockCustomer;
    const lockReasonText = 'locked due to lorem ipsum';
    component.lockReasonText = lockReasonText;
    fixture.detectChanges();

    const expectedCustomerData = {
      ...mockCustomer,
      locked: true,
      lockReason: lockReasonText
    };
    customerApiService.updateCustomer.and.returnValue(of(expectedCustomerData));

    component.lockCustomer();

    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData);
    expect(component.customerData).toEqual(expectedCustomerData);
  });

  it('unlock customer', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.customerData = {
      ...mockCustomer,
      locked: true,
      lockedBy: 'whoever',
      lockReason: 'lock-text'
    };
    fixture.detectChanges();

    const expectedCustomerData = {
      ...mockCustomer,
      locked: false
    };
    customerApiService.updateCustomer.and.returnValue(of(expectedCustomerData));

    component.unlockCustomer();

    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData);
    expect(component.customerData).toEqual(expectedCustomerData);
  });

  it('add new note to customer', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.customerData = mockCustomer;
    component.customerNotes = [];
    component.showAddNewNoteModal = true;
    const noteText = 'new note\ntext';
    const sanitizedNoteText = 'new note<br/>text';
    component.newNoteText = noteText;
    fixture.detectChanges();

    const resultNote: CustomerNoteItem = {
      author: 'author1',
      timestamp: moment('2023-03-22T19:45:25.615477+01:00').toDate(),
      note: sanitizedNoteText
    };
    customerNoteApiService.createNewNote.and.returnValue(of(resultNote));

    component.addNewNote();

    expect(customerNoteApiService.createNewNote).toHaveBeenCalledWith(mockCustomer.id, sanitizedNoteText);
    expect(component.customerNotes[0]).toEqual(resultNote);
    expect(component.newNoteText).toBeUndefined();
    expect(component.showAddNewNoteModal).toBeFalsy();
  });

  function getTextByTestId(fixture: ComponentFixture<CustomerDetailComponent>, testId: string): string {
    return fixture.debugElement.query(By.css(`[testid="${testId}"]`)).nativeElement.textContent;
  }

});
