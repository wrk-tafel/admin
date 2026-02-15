import type {MockedObject} from "vitest";
import {HttpHeaders, HttpResponse} from '@angular/common/http';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import moment from 'moment';
import {of, throwError} from 'rxjs';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {CustomerApiService, CustomerData, Gender} from '../../../../api/customer-api.service';
import {CustomerDetailComponent} from './customer-detail.component';
import {CommonModule, Location, registerLocaleData} from '@angular/common';
import {DEFAULT_CURRENCY_CODE, LOCALE_ID} from '@angular/core';
import {
  CustomerNoteApiService,
  CustomerNoteItem,
  CustomerNotesResponse
} from '../../../../api/customer-note-api.service';
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
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {TafelPaginationData} from '../../../../common/components/tafel-pagination/tafel-pagination.component';
import {provideRouter} from '@angular/router';
import {CustomerEditComponent} from '../customer-edit/customer-edit.component';
import {provideLocationMocks} from '@angular/common/testing';
import {CustomerSearchComponent} from '../customer-search/customer-search.component';
import localeDeAt from '@angular/common/locales/de-AT';

// Register de-AT locale
registerLocaleData(localeDeAt);

describe('CustomerDetailComponent', () => {
  let customerApiService: MockedObject<CustomerApiService>;
  let customerNoteApiService: MockedObject<CustomerNoteApiService>;
  let fileHelperService: MockedObject<FileHelperService>;
  let toastService: MockedObject<ToastService>;

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
    gender: Gender.MALE,
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
    pendingCostContribution: 123,

    validUntil: moment().add(1, 'years').startOf('day').utc().toDate(),

    additionalPersons: [
      {
        key: 0,
        id: 0,
        lastname: 'Add',
        firstname: 'Pers 1',
        birthDate: moment().subtract(5, 'years').startOf('day').utc().toDate(),
        gender: Gender.FEMALE,
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
        gender: Gender.MALE,
        country: mockCountry,
        excludeFromHousehold: true,
        receivesFamilyBonus: false
      }
    ]
  };
  const mockCustomerNotesResponse: CustomerNotesResponse = {
    items: [
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
    ],
    totalCount: 1,
    currentPage: 0,
    totalPages: 1,
    pageSize: 10
  };

  beforeEach((() => {
    const customerApiServiceSpy = {
      generatePdf: vi.fn().mockName("CustomerApiService.generatePdf"),
      deleteCustomer: vi.fn().mockName("CustomerApiService.deleteCustomer"),
      updateCustomer: vi.fn().mockName("CustomerApiService.updateCustomer")
    };
    const customerNoteApiServiceSpy = {
      createNewNote: vi.fn().mockName("CustomerNoteApiService.createNewNote"),
      getNotesForCustomer: vi.fn().mockName("CustomerNoteApiService.getNotesForCustomer")
    };
    const fileHelperServiceSpy = {
      downloadFile: vi.fn().mockName("FileHelperService.downloadFile")
    };
    const toastServiceSpy = {
      showToast: vi.fn().mockName("ToastService.showToast")
    };

    TestBed.configureTestingModule({
      imports: [
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
      providers: [
        provideNoopAnimations(),
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
          provide: ToastService,
          useValue: toastServiceSpy
        },
        provideRouter([
          {
            path: 'kunden/bearbeiten/:id',
            component: CustomerEditComponent,
          },
          {
            path: 'kunden/suchen',
            component: CustomerSearchComponent
          }
        ]),
        provideLocationMocks()
      ]
    }).compileComponents();

    customerApiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
    customerNoteApiService = TestBed.inject(CustomerNoteApiService) as MockedObject<CustomerNoteApiService>;
    fileHelperService = TestBed.inject(FileHelperService) as MockedObject<FileHelperService>;
    toastService = TestBed.inject(ToastService) as MockedObject<ToastService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('initial data loaded and shown correctly', async () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    const component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.customerData()).toEqual(mockCustomer);
    expect(component.customerNotes()).toEqual(mockCustomerNotesResponse.items);
    const expectedPaginationData: TafelPaginationData = {
      count: mockCustomerNotesResponse.items.length,
      currentPage: mockCustomerNotesResponse.currentPage,
      totalCount: mockCustomerNotesResponse.totalCount,
      totalPages: mockCustomerNotesResponse.totalPages,
      pageSize: mockCustomerNotesResponse.pageSize
    };
    expect(component.customerNotesPaginationData()).toEqual(expectedPaginationData);

    expect(getTextByTestId(fixture, 'customerIdText')).toBe('133');
    expect(getTextByTestId(fixture, 'nameText')).toBe('Mustermann Max');

    const birthDateAge = moment(mockCustomer.birthDate).format('DD.MM.YYYY') + ' (' + moment().diff(mockCustomer.birthDate, 'years') + ')';
    expect(getTextByTestId(fixture, 'birthDateAgeText')).toBe(birthDateAge);
    expect(getTextByTestId(fixture, 'genderText')).toBe('Männlich');
    expect(getTextByTestId(fixture, 'countryText')).toBe('Österreich');
    expect(getTextByTestId(fixture, 'telephoneNumberText')).toBe('00436644123123123');
    expect(getTextByTestId(fixture, 'emailText')).toBe('max.mustermann@gmail.com');
    expect(getTextByTestId(fixture, 'addressLine1Text')).toBe('Teststraße 123A, Stiege 1, Top 21');
    expect(getTextByTestId(fixture, 'addressLine2Text')).toBe('1020 Wien');
    expect(getTextByTestId(fixture, 'employerText')).toBe('test employer');
    expect(getTextByTestId(fixture, 'incomeText')).toBe('€ 1.000,00');

    expect(getTextByTestId(fixture, 'incomeDueText')).toBe(moment(mockCustomer.incomeDue).format('DD.MM.YYYY'));
    expect(getTextByTestId(fixture, 'validUntilText')).toBe(moment(mockCustomer.validUntil).format('DD.MM.yyyy'));
    expect(getTextByTestId(fixture, 'issuedInformation'))
      .toBe('am ' + moment(mockCustomer.issuedAt).format('DD.MM.YYYY') + ' von 12345 first last');
    expect(getTextByTestId(fixture, 'pendingCostContributionText').trim()).toBe('€ 123,00');

    expect(getTextByTestId(fixture, 'addperson-0-lastnameText')).toBe('Add');
    expect(getTextByTestId(fixture, 'addperson-0-firstnameText')).toBe('Pers 1');
    expect(getTextByTestId(fixture, 'addperson-0-receivesFamilyBonus')).toBe('Ja');

    const birthDateAgePers1 = moment(mockCustomer.additionalPersons[0].birthDate).format('DD.MM.YYYY') +
      ' (' + moment().diff(mockCustomer.additionalPersons[0].birthDate, 'years') + ')';
    expect(getTextByTestId(fixture, 'addperson-0-birthDateAgeText')).toBe(birthDateAgePers1);
    expect(getTextByTestId(fixture, 'addperson-0-genderText')).toBe('Weiblich');

    expect(getTextByTestId(fixture, 'addperson-0-countryText')).toBe('Österreich');
    expect(getTextByTestId(fixture, 'addperson-0-employerText')).toBe('test employer 2');
    expect(getTextByTestId(fixture, 'addperson-0-incomeText')).toBe('€ 50,00');
    expect(getTextByTestId(fixture, 'addperson-0-incomeDueText'))
      .toBe(moment(mockCustomer.additionalPersons[0].incomeDue).format('DD.MM.YYYY'));

    expect(getTextByTestId(fixture, 'addperson-1-incomeText')).toBe('-');
    expect(getTextByTestId(fixture, 'addperson-1-incomeDueText')).toBe('-');

    // validate note
    const expectedTimestamp = moment(mockCustomerNotesResponse.items[0].timestamp).format('DD.MM.YYYY HH:mm');
    // expect(getTextByTestId(fixture, 'note-title')).toBe(expectedTimestamp + ' author1');

    // TODO fix flaky assert
    // expect(getTextByTestId(fixture, 'note-text')).toBe('note from author 2');
  });

  it('printMasterdata', () => {
    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders({'Content-Disposition': 'inline; filename=test-name-1.pdf'}),
      body: new Blob()
    });
    customerApiService.generatePdf.mockImplementation((id, type) =>
      id === mockCustomer.id && type === 'MASTERDATA' ? of(response) : of(response)
    );

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    const component = fixture.componentInstance;

    fixture.detectChanges();
    component.printMasterdata();

    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('test-name-1.pdf', response.body);
  });

  it('printIdCard', () => {
    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders({'Content-Disposition': 'inline; filename=test-name-1.pdf'}),
      body: new Blob()
    });
    customerApiService.generatePdf.mockImplementation((id, type) =>
      id === mockCustomer.id && type === 'IDCARD' ? of(response) : of(response)
    );

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    const component = fixture.componentInstance;

    fixture.detectChanges();
    component.printIdCard();

    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('test-name-1.pdf', response.body);
  });

  it('printCombined', () => {
    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders({'Content-Disposition': 'inline; filename=test-name-1.pdf'}),
      body: new Blob()
    });
    customerApiService.generatePdf.mockImplementation((id, type) =>
      id === mockCustomer.id && type === 'COMBINED' ? of(response) : of(response)
    );

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    const component = fixture.componentInstance;

    fixture.detectChanges();

    component.printCombined();

    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('test-name-1.pdf', response.body);
  });

  it('editCustomer', async () => {
    const location = TestBed.inject(Location);

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    await component.editCustomer();

    expect(location.path()).toBe('/kunden/bearbeiten/' + mockCustomer.id);
  });

  it('isValid with date of yesterday results in false', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', {
      ...mockCustomer,
      validUntil: moment().subtract(1, 'days').toDate()
    });
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const valid = component.isValid();

    expect(valid).toBeFalsy();
  });

  it('isValid with date of today results in true', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', {
      ...mockCustomer,
      validUntil: moment().toDate()
    });
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const valid = component.isValid();

    expect(valid).toBe(true);
  });

  it('isValid with date of tomorrow results in true', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', {
      ...mockCustomer,
      validUntil: moment().add(1, 'days').toDate()
    });
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const valid = component.isValid();
    expect(valid).toBe(true);

    // TODO expect(incomeDueText)-class success or danger
  });

  it('delete customer successful', async () => {
    const location = TestBed.inject(Location);

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    customerApiService.deleteCustomer.mockReturnValue(of(null));

    await component.deleteCustomer();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(customerApiService.deleteCustomer).toHaveBeenCalled();
    expect(location.path()).toBe('/kunden/suchen');
    expect(toastService.showToast).toHaveBeenCalledWith({type: ToastType.SUCCESS, title: 'Kunde wurde gelöscht!'});
  });

  it('delete customer failed', () => {
    const location = TestBed.inject(Location);

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.showDeleteCustomerModal.set(true);

    customerApiService.deleteCustomer.mockReturnValue(throwError(() => {
      return {status: 404};
    }));

    component.deleteCustomer();

    expect(customerApiService.deleteCustomer).toHaveBeenCalled();
    expect(location.path()).not.toBe('/kunden/suchen');
    expect(component.showDeleteCustomerModal()).toBeFalsy();
    expect(toastService.showToast).toHaveBeenCalledWith({type: ToastType.ERROR, title: 'Löschen fehlgeschlagen!'});
  });

  it('prolong customer', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const expectedCustomerData = {
      ...mockCustomer,
      validUntil: moment(mockCustomer.validUntil).add(3, 'months').endOf('day').toDate()
    };
    customerApiService.updateCustomer.mockReturnValue(of(expectedCustomerData));

    component.prolongCustomer(3);

    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData);
    expect(component.customerData()).toEqual(expectedCustomerData);
  });

  it('invalidate customer', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const expectedCustomerData = {
      ...mockCustomer,
      validUntil: moment().subtract(1, 'day').endOf('day').toDate()
    };
    customerApiService.updateCustomer.mockReturnValue(of(expectedCustomerData));

    component.invalidateCustomer();

    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData);
    expect(component.customerData()).toEqual(expectedCustomerData);
  });

  it('lock customer', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const lockReasonText = 'locked due to lorem ipsum';
    component.lockReasonText.set(lockReasonText);

    const expectedCustomerData = {
      ...mockCustomer,
      locked: true,
      lockReason: lockReasonText
    };
    customerApiService.updateCustomer.mockReturnValue(of(expectedCustomerData));

    component.lockCustomer();

    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData);
    expect(component.customerData()).toEqual(expectedCustomerData);
  });

  it('unlock customer', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', {
      ...mockCustomer,
      locked: true,
      lockedBy: 'whoever',
      lockReason: 'lock-text'
    });
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const expectedCustomerData = {
      ...mockCustomer,
      locked: false,
      lockedBy: null,
      lockReason: null
    };
    customerApiService.updateCustomer.mockReturnValue(of(expectedCustomerData));

    component.unlockCustomer();

    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData);
    expect(component.customerData()).toEqual(expectedCustomerData);
  });

  it('add new note to customer', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', {
      items: [],
      totalCount: 0,
      currentPage: 0,
      totalPages: 0,
      pageSize: 10
    });
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.showAddNewNoteModal.set(true);
    const noteText = 'new note\ntext';
    const sanitizedNoteText = 'new note<br/>text';
    component.newNoteText.set(noteText);

    const resultNote: CustomerNoteItem = {
      author: 'author1',
      timestamp: moment('2023-03-22T19:45:25.615477+01:00').toDate(),
      note: sanitizedNoteText
    };
    customerNoteApiService.createNewNote.mockReturnValue(of(resultNote));

    component.addNewNote();

    expect(customerNoteApiService.createNewNote).toHaveBeenCalledWith(mockCustomer.id, sanitizedNoteText);
    expect(component.customerNotes()[0]).toEqual(resultNote);
    expect(component.newNoteText()).toBeNull();
    expect(component.showAddNewNoteModal()).toBeFalsy();
  });

  function getTextByTestId(fixture: ComponentFixture<CustomerDetailComponent>, testId: string): string {
    const element = fixture.debugElement.query(By.css(`[testid="${testId}"]`));
    if (!element) {
      throw new Error(`Element with testid="${testId}" not found`);
    }
    return element.nativeElement.textContent;
  }

});
