import type {MockedObject} from 'vitest';
import {HttpHeaders, HttpResponse} from '@angular/common/http';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import dayjs from 'dayjs';
import {of, Subject, throwError} from 'rxjs';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {CustomerApiService, CustomerData, Gender, CustomerUpdateResponse} from '../../../../api/customer-api.service';
import {CustomerDetailComponent} from './customer-detail.component';
import {CommonModule, Location} from '@angular/common';
import {signal} from '@angular/core';
import {
  CustomerNoteApiService,
  CustomerNoteItem,
  CustomerNotesResponse
} from '../../../../api/customer-note-api.service';
import {
  CustomerDocumentApiService,
  CustomerDocumentsResponse,
  DocumentType
} from '../../../../api/customer-document-api.service';
import {DocumentScannerApiService} from '../../../../api/document-scanner-api.service';
import {MatDialog} from '@angular/material/dialog';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {provideRouter} from '@angular/router';
import {CustomerEditComponent} from '../customer-edit/customer-edit.component';
import {provideLocationMocks} from '@angular/common/testing';
import {CustomerSearchComponent} from '../customer-search/customer-search.component';
import {DistributionTicketApiService} from '../../../../api/distribution-ticket-api.service';
import {DistributionApiService, DistributionItem} from '../../../../api/distribution-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {
  ConfirmCustomerSaveDialog
} from '../../components/confirm-customer-save-dialog/confirm-customer-save-dialog.component';
import {LockCustomerDialogComponent} from './dialogs/lock-customer-dialog.component';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {
  EditCostContributionDialogComponent
} from '../../../../common/components/edit-cost-contribution-dialog/edit-cost-contribution-dialog.component';
import {AuthenticationService} from '../../../../common/security/authentication.service';

describe('CustomerDetailComponent', () => {
  let customerApiService: MockedObject<CustomerApiService>;
  let customerNoteApiService: MockedObject<CustomerNoteApiService>;
  let customerDocumentApiService: MockedObject<CustomerDocumentApiService>;
  let fileHelperService: MockedObject<FileHelperService>;
  let toastr: MockedObject<TafelToastrService>;
  let distributionTicketApiService: MockedObject<DistributionTicketApiService>;
  let distributionApiService: MockedObject<DistributionApiService>;
  const currentDistributionSignal = signal<DistributionItem | null>(null);

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
    issuedAt: dayjs().startOf('day').toDate(),
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: dayjs().subtract(30, 'years').startOf('day').toDate(),
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
    incomeDue: dayjs().add(1, 'years').startOf('day').toDate(),
    pendingCostContribution: 123,
    singleParent: true,

    validUntil: dayjs().add(1, 'years').startOf('day').toDate(),

    additionalPersons: [
      {
        key: 0,
        id: 0,
        lastname: 'Add',
        firstname: 'Pers 1',
        birthDate: dayjs().subtract(5, 'years').startOf('day').toDate(),
        gender: Gender.FEMALE,
        employer: 'test employer 2',
        income: 50,
        incomeDue: dayjs().add(1, 'years').startOf('day').toDate(),
        country: mockCountry,
        excludeFromHousehold: false,
        receivesFamilyAllowance: true
      },
      {
        key: 1,
        id: 1,
        lastname: 'Add',
        firstname: 'Pers 2',
        birthDate: dayjs().subtract(10, 'years').startOf('day').toDate(),
        gender: Gender.MALE,
        country: mockCountry,
        excludeFromHousehold: true,
        receivesFamilyAllowance: false
      }
    ]
  };
  const mockCustomerNotesResponse: CustomerNotesResponse = {
    items: [
      {
        id: 118,
        author: 'author1',
        timestamp: dayjs('2023-03-22T19:45:25.615477+01:00').toDate(),
        note: 'note from author 2',
        editable: true
      },
      {
        id: 123,
        author: 'author2',
        timestamp: dayjs('2023-03-20T19:45:25.615477+01:00').toDate(),
        note: 'note from author 1',
        editable: false
      }
    ],
    totalCount: 1,
    currentPage: 0,
    totalPages: 1,
    pageSize: 10
  };
  const mockCustomerDocumentsResponse: CustomerDocumentsResponse = {
    items: [
      {
        id: 1,
        documentType: DocumentType.ID,
        fileName: 'ausweis.jpg',
        uploadedAt: dayjs('2023-03-22T19:45:25.615477+01:00').toDate(),
        uploadedBy: 'author1'
      }
    ]
  };

  const mockUpdateSuccessResponse: CustomerUpdateResponse = {
    data: mockCustomer,
    errorMsg: null
  };

  beforeEach((() => {
    const customerApiServiceSpy = {
      generatePdf: vi.fn().mockName('CustomerApiService.generatePdf'),
      exportHousehold: vi.fn().mockName('CustomerApiService.exportHousehold'),
      deleteCustomer: vi.fn().mockReturnValue(of(undefined)).mockName('CustomerApiService.deleteCustomer'),
      updateCustomer: vi.fn().mockImplementation((customerData: CustomerData) => of({
        data: customerData,
        errorMsg: null
      })),
      payCostContribution: vi.fn().mockName('CustomerApiService.payCostContribution'),
      editCostContribution: vi.fn().mockName('CustomerApiService.editCostContribution')
    };
    const customerNoteApiServiceSpy = {
      createNewNote: vi.fn().mockName('CustomerNoteApiService.createNewNote'),
      updateNote: vi.fn().mockName('CustomerNoteApiService.updateNote'),
      deleteNote: vi.fn().mockName('CustomerNoteApiService.deleteNote'),
      getNotesForCustomer: vi.fn().mockReturnValue(of(mockCustomerNotesResponse)).mockName('CustomerNoteApiService.getNotesForCustomer')
    };
    const customerDocumentApiServiceSpy = {
      getDocumentsForCustomer: vi.fn().mockName('CustomerDocumentApiService.getDocumentsForCustomer'),
      uploadDocument: vi.fn().mockName('CustomerDocumentApiService.uploadDocument'),
      importScannerDocument: vi.fn().mockName('CustomerDocumentApiService.importScannerDocument'),
      downloadDocument: vi.fn().mockName('CustomerDocumentApiService.downloadDocument'),
      deleteDocument: vi.fn().mockReturnValue(of(undefined)).mockName('CustomerDocumentApiService.deleteDocument')
    };
    const documentScannerApiServiceSpy = {
      getScannerFiles: vi.fn().mockReturnValue(of({items: []})).mockName('DocumentScannerApiService.getScannerFiles'),
      listenForScannerFileChanges: vi.fn().mockReturnValue(of({items: []}))
        .mockName('DocumentScannerApiService.listenForScannerFileChanges')
    };
    const fileHelperServiceSpy = {
      downloadFile: vi.fn().mockName('FileHelperService.downloadFile')
    };
    const toastrSpy = {
      error: vi.fn().mockName('TafelToastrService.error'),
      success: vi.fn().mockName('TafelToastrService.success'),
      warning: vi.fn().mockName('TafelToastrService.warning')
    };
    const distributionTicketApiServiceSpy = {
      getCurrentTicketForCustomer: vi.fn().mockName('DistributionTicketApiService.getCurrentTicketForCustomer')
        .mockReturnValue(throwError(() => ({status: 404}))),
      deleteCurrentTicketOfCustomer: vi.fn().mockName('DistributionTicketApiService.deleteCurrentTicketOfCustomer')
    };
    const distributionApiServiceSpy = {
      assignCustomer: vi.fn().mockName('DistributionApiService.assignCustomer')
    };
    currentDistributionSignal.set(null);
    const globalStateServiceSpy = {
      getCurrentDistribution: vi.fn().mockReturnValue(currentDistributionSignal)
    };

    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        NoopAnimationsModule
      ],
      providers: [
        {
          provide: CustomerApiService,
          useValue: customerApiServiceSpy
        },
        {
          provide: CustomerNoteApiService,
          useValue: customerNoteApiServiceSpy
        },
        {
          provide: CustomerDocumentApiService,
          useValue: customerDocumentApiServiceSpy
        },
        {
          provide: DocumentScannerApiService,
          useValue: documentScannerApiServiceSpy
        },
        {
          provide: FileHelperService,
          useValue: fileHelperServiceSpy
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
        },
        {
          provide: DistributionTicketApiService,
          useValue: distributionTicketApiServiceSpy
        },
        {
          provide: DistributionApiService,
          useValue: distributionApiServiceSpy
        },
        {
          provide: GlobalStateService,
          useValue: globalStateServiceSpy
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
    customerDocumentApiService = TestBed.inject(CustomerDocumentApiService) as MockedObject<CustomerDocumentApiService>;
    fileHelperService = TestBed.inject(FileHelperService) as MockedObject<FileHelperService>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
    distributionTicketApiService = TestBed.inject(DistributionTicketApiService) as MockedObject<DistributionTicketApiService>;
    distributionApiService = TestBed.inject(DistributionApiService) as MockedObject<DistributionApiService>;
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
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.customerData()).toEqual(mockCustomer);
    expect(component.customerNotes()).toEqual(mockCustomerNotesResponse.items);

    expect(getTextByTestId(fixture, 'customerIdText')).toBe('133');
    expect(getTextByTestId(fixture, 'nameText')).toBe('Mustermann Max');

    const birthDateAge = dayjs(mockCustomer.birthDate).format('DD.MM.YYYY') + ' (' + dayjs().diff(mockCustomer.birthDate, 'years') + ')';
    expect(getTextByTestId(fixture, 'birthDateAgeText')).toBe(birthDateAge);
    expect(getTextByTestId(fixture, 'genderText')).toBe('Männlich');
    expect(getTextByTestId(fixture, 'countryText')).toBe('Österreich');
    expect(getTextByTestId(fixture, 'telephoneNumberText')).toBe('00436644123123123');
    expect(getTextByTestId(fixture, 'emailText')).toBe('max.mustermann@gmail.com');
    expect(getTextByTestId(fixture, 'addressLine1Text')).toBe('Teststraße 123A, Stiege 1, Top 21');
    expect(getTextByTestId(fixture, 'addressLine2Text')).toBe('1020 Wien');
    expect(getTextByTestId(fixture, 'employerText')).toBe('test employer');
    expect(getTextByTestId(fixture, 'incomeText')).toBe('1.000,00 €');

    expect(getTextByTestId(fixture, 'incomeDueText')).toBe(dayjs(mockCustomer.incomeDue).format('DD.MM.YYYY'));
    expect(getTextByTestId(fixture, 'validUntilText')).toBe(dayjs(mockCustomer.validUntil).format('DD.MM.YYYY'));
    expect(getTextByTestId(fixture, 'issuedInformation'))
      .toBe('am ' + dayjs(mockCustomer.issuedAt).format('DD.MM.YYYY') + ' von 12345 first last');
    expect(getTextByTestId(fixture, 'pendingCostContributionText').trim()).toBe('123,00 €');
    expect(getTextByTestId(fixture, 'singleParentText')).toBe('Ja');

    expect(getTextByTestId(fixture, 'note-text')).toBe('note from author 2');

    // Switch to the "Weitere Personen" tab to render its content
    const tabLabels = fixture.nativeElement.querySelectorAll('.mat-mdc-tab');
    tabLabels[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(getTextByTestId(fixture, 'addperson-0-lastnameText')).toBe('Add');
    expect(getTextByTestId(fixture, 'addperson-0-firstnameText')).toBe('Pers 1');
    expect(getTextByTestId(fixture, 'addperson-0-receivesFamilyAllowance')).toBe('Ja');

    const birthDateAgePers1 = dayjs(mockCustomer.additionalPersons![0].birthDate).format('DD.MM.YYYY') +
      ' (' + dayjs().diff(mockCustomer.additionalPersons![0].birthDate, 'years') + ')';
    expect(getTextByTestId(fixture, 'addperson-0-birthDateAgeText')).toBe(birthDateAgePers1);
    expect(getTextByTestId(fixture, 'addperson-0-genderText')).toBe('Weiblich');

    expect(getTextByTestId(fixture, 'addperson-0-countryText')).toBe('Österreich');
    expect(getTextByTestId(fixture, 'addperson-0-employerText')).toBe('test employer 2');
    expect(getTextByTestId(fixture, 'addperson-0-incomeText')).toBe('50,00 €');
    expect(getTextByTestId(fixture, 'addperson-0-incomeDueText'))
      .toBe(dayjs(mockCustomer.additionalPersons![0].incomeDue).format('DD.MM.YYYY'));

    expect(getTextByTestId(fixture, 'addperson-1-incomeText')).toBe('-');
    expect(getTextByTestId(fixture, 'addperson-1-incomeDueText')).toBe('-');
  });

  it('note text is rendered as plain text, keeping newlines and escaping markup', () => {
    const notesWithMarkup: CustomerNotesResponse = {
      ...mockCustomerNotesResponse,
      items: [
        {
          id: 500,
          author: 'author1',
          timestamp: dayjs('2023-03-22T19:45:25.615477+01:00').toDate(),
          note: 'Zeile eins\nZeile zwei <b>fett</b>',
          editable: true
        }
      ]
    };

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', notesWithMarkup);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    fixture.detectChanges();

    const noteElement = fixture.debugElement.query(By.css('[testid="note-text"]')).nativeElement;

    // The newline has to survive into the text, and the tag must stay text rather than becoming
    // an element - free-text notes are never markup.
    expect(noteElement.textContent).toBe('Zeile eins\nZeile zwei <b>fett</b>');
    expect(noteElement.querySelector('b')).toBeNull();
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
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
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
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;

    fixture.detectChanges();
    component.printIdCard();

    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('test-name-1.pdf', response.body);
  });

  it('printPrivacyNotice', () => {
    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders({'Content-Disposition': 'inline; filename=test-name-1.pdf'}),
      body: new Blob()
    });
    customerApiService.generatePdf.mockImplementation((id, type) =>
      id === mockCustomer.id && type === 'PRIVACY_NOTICE' ? of(response) : of(response)
    );

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;

    fixture.detectChanges();
    component.printPrivacyNotice();

    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('test-name-1.pdf', response.body);
  });

  it('exportHousehold', () => {
    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders({'Content-Disposition': 'inline; filename=datenexport-1.zip'}),
      body: new Blob()
    });
    customerApiService.exportHousehold.mockReturnValue(of(response));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;

    fixture.detectChanges();
    component.exportHousehold();

    expect(customerApiService.exportHousehold).toHaveBeenCalledWith(mockCustomer.id);
    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('datenexport-1.zip', response.body);
    expect(component.exporting()).toBe(false);
  });

  it('editCustomer', async () => {
    const location = TestBed.inject(Location);

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    await component.editCustomer();

    expect(location.path()).toBe('/kunden/bearbeiten/' + mockCustomer.id);
  });

  it('isValid with date of yesterday results in false', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', {
      ...mockCustomer,
      validUntil: dayjs().subtract(1, 'days').toDate()
    });
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const valid = component.isValid();

    expect(valid).toBeFalsy();
    const validUntilText = fixture.debugElement.query(By.css('[testid="validUntilText"]'));
    expect(validUntilText.nativeElement.classList).toContain('bg-red-600');
    expect(validUntilText.nativeElement.classList).not.toContain('bg-green-700');
  });

  it('isValid with date of today results in true', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', {
      ...mockCustomer,
      validUntil: dayjs().toDate()
    });
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const valid = component.isValid();

    expect(valid).toBe(true);
    const validUntilText = fixture.debugElement.query(By.css('[testid="validUntilText"]'));
    expect(validUntilText.nativeElement.classList).toContain('bg-green-700');
    expect(validUntilText.nativeElement.classList).not.toContain('bg-red-600');
  });

  it('isValid with date of tomorrow results in true', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', {
      ...mockCustomer,
      validUntil: dayjs().add(1, 'days').toDate()
    });
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const valid = component.isValid();
    expect(valid).toBe(true);
    const validUntilText = fixture.debugElement.query(By.css('[testid="validUntilText"]'));
    expect(validUntilText.nativeElement.classList).toContain('bg-green-700');
    expect(validUntilText.nativeElement.classList).not.toContain('bg-red-600');
  });

  it('delete customer successful', async () => {
    const location = TestBed.inject(Location);
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({afterClosed: () => of(true)} as any);

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    customerApiService.deleteCustomer.mockReturnValue(of(undefined));

    component.openDeleteCustomerDialog();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(customerApiService.deleteCustomer).toHaveBeenCalled();
    expect(location.path()).toBe('/kunden/suchen');
    expect(toastr.success).toHaveBeenCalledWith('Kunde wurde gelöscht!');
  });

  it('delete customer failed', () => {
    const location = TestBed.inject(Location);
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({afterClosed: () => of(true)} as any);

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    customerApiService.deleteCustomer.mockReturnValue(throwError(() => ({status: 404})));

    component.openDeleteCustomerDialog();

    expect(customerApiService.deleteCustomer).toHaveBeenCalled();
    expect(location.path()).not.toBe('/kunden/suchen');
    expect(toastr.error).toHaveBeenCalledWith('Es ist ein unerwarteter Fehler aufgetreten.', 'Löschen fehlgeschlagen!');
  });

  it('prolong customer', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const expectedCustomerData = {
      ...mockCustomer,
      validUntil: dayjs(mockCustomer.validUntil).add(3, 'months').endOf('day').toDate()
    };
    const mockUpdateSuccessResponse: CustomerUpdateResponse = {
      data: expectedCustomerData,
      errorMsg: null
    };
    customerApiService.updateCustomer.mockReturnValue(of(mockUpdateSuccessResponse));

    component.prolongCustomer(3);

    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData, false, expect.anything());
    expect(component.customerData()).toEqual(expectedCustomerData);
  });

  it('invalidate customer', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const expectedCustomerData = {
      ...mockCustomer,
      validUntil: dayjs().subtract(1, 'day').endOf('day').toDate()
    };
    const mockUpdateSuccessResponse: CustomerUpdateResponse = {
      data: expectedCustomerData,
      errorMsg: null
    };
    customerApiService.updateCustomer.mockReturnValue(of(mockUpdateSuccessResponse));

    component.disableCustomer();

    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData, false, expect.anything());
    expect(component.customerData()).toEqual(expectedCustomerData);
  });

  it('disable customer with 409 conflict shows confirmation dialog', () => {
    const expectedCustomerData = {
      ...mockCustomer,
      validUntil: dayjs().subtract(1, 'day').endOf('day').toDate()
    };

    customerApiService.updateCustomer.mockReturnValue(throwError(() => ({
      status: 409,
      error: {
        detail: 'Conflict: customer was updated by another user',
        body: { data: mockCustomer, errorMsg: 'Conflict: customer was updated by another user' }
      }
    })));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({
      afterClosed: vi.fn().mockReturnValue(of(false))
    } as any);

    component.disableCustomer();

    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData, false, expect.anything());
    expect(matDialog.open).toHaveBeenCalledWith(ConfirmCustomerSaveDialog, {
      data: {
        message: 'Conflict: customer was updated by another user'
      }
    });
  });

  it('lock customer', () => {
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    const lockReasonText = 'locked due to lorem ipsum';
    matDialog.open.mockReturnValue({afterClosed: () => of(lockReasonText)} as any);

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const expectedCustomerData = {
      ...mockCustomer,
      locked: true,
      lockReason: lockReasonText
    };
    const mockUpdateSuccessResponse: CustomerUpdateResponse = {
      data: expectedCustomerData,
      errorMsg: null
    };
    customerApiService.updateCustomer.mockReturnValue(of(mockUpdateSuccessResponse));

    component.openLockCustomerDialog();

    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData, false, expect.anything());
    expect(component.customerData()).toEqual(expectedCustomerData);
  });

  it('lock customer with 409 conflict shows confirmation dialog and keeps the entered lock reason', () => {
    const lockReasonText = 'locked due to lorem ipsum';
    const expectedCustomerData = {
      ...mockCustomer,
      locked: true,
      lockReason: lockReasonText
    };

    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockImplementation((component: unknown) => {
      if (component === LockCustomerDialogComponent) {
        return {afterClosed: () => of(lockReasonText)} as any;
      }
      return {afterClosed: vi.fn().mockReturnValue(of(false))} as any;
    });

    customerApiService.updateCustomer.mockReturnValue(throwError(() => ({
      status: 409,
      error: {
        detail: 'Conflict: customer was updated by another user',
        body: { data: mockCustomer, errorMsg: 'Conflict: customer was updated by another user' }
      }
    })));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.openLockCustomerDialog();

    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData, false, expect.anything());
    expect(matDialog.open).toHaveBeenCalledWith(ConfirmCustomerSaveDialog, {
      data: {
        message: 'Conflict: customer was updated by another user'
      }
    });
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
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const expectedCustomerData = {
      ...mockCustomer,
      locked: false,
      lockedBy: null,
      lockReason: null
    };
    const mockUpdateSuccessResponse: CustomerUpdateResponse = {
      data: expectedCustomerData,
      errorMsg: null
    };
    customerApiService.updateCustomer.mockReturnValue(of(mockUpdateSuccessResponse));

    component.unlockCustomer();

    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData, false, expect.anything());
    expect(component.customerData()).toEqual(expectedCustomerData);
  });

  it('unlock customer with 409 conflict shows confirmation dialog', () => {
    const lockedCustomer = {
      ...mockCustomer,
      locked: true,
      lockedBy: 'whoever',
      lockReason: 'lock-text'
    };
    const expectedCustomerData = {
      ...lockedCustomer,
      locked: false,
      lockedBy: null,
      lockReason: null
    };

    customerApiService.updateCustomer.mockReturnValue(throwError(() => ({
      status: 409,
      error: {
        detail: 'Conflict: customer was updated by another user',
        body: { data: lockedCustomer, errorMsg: 'Conflict: customer was updated by another user' }
      }
    })));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', lockedCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({
      afterClosed: vi.fn().mockReturnValue(of(false))
    } as any);

    component.unlockCustomer();

    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData, false, expect.anything());
    expect(matDialog.open).toHaveBeenCalledWith(ConfirmCustomerSaveDialog, {
      data: {
        message: 'Conflict: customer was updated by another user'
      }
    });
  });

  it('add new note to customer', () => {
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    const noteText = 'new note\ntext';
    matDialog.open.mockReturnValue({afterClosed: () => of(noteText)} as any);

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', {
      items: [],
      totalCount: 0,
      currentPage: 0,
      totalPages: 0,
      pageSize: 10
    });
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const resultNote: CustomerNoteItem = {
      id: 627,
      author: 'author1',
      timestamp: dayjs('2023-03-22T19:45:25.615477+01:00').toDate(),
      note: noteText,
      editable: true
    };
    customerNoteApiService.createNewNote.mockReturnValue(of(resultNote));

    component.openAddNoteDialog();

    expect(customerNoteApiService.createNewNote).toHaveBeenCalledWith(mockCustomer.id, noteText);
    expect(component.customerNotes()[0]).toEqual(resultNote);
  });

  it('add new note also updates customerNotesResponse so "show all notes" displays it', () => {
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    const noteText = 'fresh note text';
    matDialog.open.mockReturnValue({afterClosed: () => of(noteText)} as any);

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const resultNote: CustomerNoteItem = {
      id: 652,
      author: 'newAuthor',
      timestamp: dayjs('2024-01-15T10:00:00.000+01:00').toDate(),
      note: noteText,
      editable: true
    };
    customerNoteApiService.createNewNote.mockReturnValue(of(resultNote));

    component.openAddNoteDialog();

    const updatedResponse = component.customerNotesResponse();
    expect(updatedResponse.items[0]).toEqual(resultNote);
    expect(updatedResponse.items).toContain(resultNote);
    expect(updatedResponse.totalCount).toBe(mockCustomerNotesResponse.totalCount + 1);
  });

  it('shows "Alle Notizen anzeigen" for a single note too, so it can be edited/deleted', () => {
    const singleNoteResponse: CustomerNotesResponse = {
      ...mockCustomerNotesResponse,
      items: [mockCustomerNotesResponse.items[0]]
    };

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', singleNoteResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="showall-notes-button"]'))).not.toBeNull();
  });

  it('shows edit/delete buttons on the "Aktuellste Notiz" preview when the latest note is editable', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    // mockCustomerNotesResponse.items[0].editable is true
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="note-editButton"]'))).not.toBeNull();
    expect(fixture.debugElement.query(By.css('[testid="note-deleteButton"]'))).not.toBeNull();
  });

  it('hides edit/delete buttons on the "Aktuellste Notiz" preview when the latest note is not editable', () => {
    const notEditableResponse: CustomerNotesResponse = {
      ...mockCustomerNotesResponse,
      items: [{...mockCustomerNotesResponse.items[0], editable: false}]
    };

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', notEditableResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="note-editButton"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[testid="note-deleteButton"]'))).toBeNull();
  });

  it('showAllNotes switches to the Notizen tab, which shows every note', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.selectedTabIndex()).toBe(0);

    component.showAllNotes();

    expect(component.selectedTabIndex()).toBe(2);
  });

  it('getAllNotesPage fetches the requested page into the Notizen tab\'s own list', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const page2Response: CustomerNotesResponse = {...mockCustomerNotesResponse, currentPage: 2};
    customerNoteApiService.getNotesForCustomer.mockReturnValue(of(page2Response));

    component.getAllNotesPage(2, 5);

    expect(customerNoteApiService.getNotesForCustomer).toHaveBeenCalledWith(mockCustomer.id, 2, 5);
    expect(component.allNotesResponse()).toEqual(page2Response);
    // paging through the tab's own list must never touch the "Aktuellste Notiz" preview's data
    expect(component.customerNotesResponse()).toEqual(mockCustomerNotesResponse);
  });

  it('editNote updates the note and refreshes both the tab list and the latest-note preview', () => {
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({afterClosed: () => of('corrected text')} as any);
    customerNoteApiService.updateNote.mockReturnValue(of(mockCustomerNotesResponse.items[0]));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.editNote(mockCustomerNotesResponse.items[0]);

    expect(customerNoteApiService.updateNote)
      .toHaveBeenCalledWith(mockCustomer.id, mockCustomerNotesResponse.items[0].id, 'corrected text');
    // once for the tab's current page, once more for the "Aktuellste Notiz" preview (page 1)
    expect(customerNoteApiService.getNotesForCustomer).toHaveBeenCalledTimes(2);
    expect(toastr.success).toHaveBeenCalledWith('Notiz wurde aktualisiert!');
  });

  it('editNote does nothing when the edit dialog is cancelled', () => {
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({afterClosed: () => of(undefined)} as any);

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.editNote(mockCustomerNotesResponse.items[0]);

    expect(customerNoteApiService.updateNote).not.toHaveBeenCalled();
  });

  it('deleteNote deletes the note and refreshes both the tab list and the latest-note preview', () => {
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({afterClosed: () => of(true)} as any);
    customerNoteApiService.deleteNote.mockReturnValue(of(undefined));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.deleteNote(mockCustomerNotesResponse.items[0]);

    expect(customerNoteApiService.deleteNote).toHaveBeenCalledWith(mockCustomer.id, mockCustomerNotesResponse.items[0].id);
    // once for the tab's current page, once more for the "Aktuellste Notiz" preview (page 1)
    expect(customerNoteApiService.getNotesForCustomer).toHaveBeenCalledTimes(2);
    expect(toastr.success).toHaveBeenCalledWith('Notiz wurde gelöscht!');
  });

  it('deleteNote does nothing when the confirmation is cancelled', () => {
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({afterClosed: () => of(false)} as any);

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.deleteNote(mockCustomerNotesResponse.items[0]);

    expect(customerNoteApiService.deleteNote).not.toHaveBeenCalled();
  });

  it('ticket section not shown when distribution is inactive', async () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const ticketInput = fixture.debugElement.query(By.css('[testid="ticket-number-input"]'));
    const ticketDisplay = fixture.debugElement.query(By.css('[testid="ticket-number-display"]'));

    expect(ticketInput).toBeFalsy();
    expect(ticketDisplay).toBeFalsy();
  });

  it('ticket section shown with input when distribution is active and no ticket assigned', async () => {
    currentDistributionSignal.set({id: 1, startedAt: new Date()});
    distributionTicketApiService.getCurrentTicketForCustomer.mockReturnValue(throwError(() => ({status: 404})));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const ticketInput = fixture.debugElement.query(By.css('[testid="ticket-number-input"]'));
    const assignButton = fixture.debugElement.query(By.css('[testid="assign-ticket-button"]'));

    expect(ticketInput).toBeTruthy();
    expect(assignButton).toBeTruthy();
  });

  it('a slower earlier ticket lookup does not overwrite a faster later one', async () => {
    currentDistributionSignal.set({id: 1, startedAt: new Date()});
    const firstLookup = new Subject<{ticketNumber: number | null}>();
    const secondLookup = new Subject<{ticketNumber: number | null}>();
    distributionTicketApiService.getCurrentTicketForCustomer
      .mockReturnValueOnce(firstLookup)
      .mockReturnValueOnce(secondLookup);

    const otherCustomer: CustomerData = {...mockCustomer, id: 999};

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    fixture.detectChanges();
    await fixture.whenStable();

    // navigating to another customer's detail (same reused component) starts a second lookup
    // before the first one has resolved
    fixture.componentRef.setInput('customerData', otherCustomer);
    fixture.detectChanges();
    await fixture.whenStable();

    // the newer lookup resolves first, the older/slower one lands after - it must not win
    secondLookup.next({ticketNumber: 99});
    firstLookup.next({ticketNumber: 1});

    expect(fixture.componentInstance.ticketNumber()).toBe(99);
  });

  it('ticket number displayed when already assigned', async () => {
    currentDistributionSignal.set({id: 1, startedAt: new Date()});
    distributionTicketApiService.getCurrentTicketForCustomer.mockReturnValue(of({ticketNumber: 42}));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const ticketDisplay = fixture.debugElement.query(By.css('[testid="ticket-number-display"]'));
    const deleteButton = fixture.debugElement.query(By.css('[testid="delete-ticket-button"]'));

    expect(ticketDisplay).toBeTruthy();
    expect(ticketDisplay.nativeElement.textContent).toContain('42');
    expect(deleteButton).toBeTruthy();
  });

  it('assign ticket calls API correctly', async () => {
    currentDistributionSignal.set({id: 1, startedAt: new Date()});
    distributionTicketApiService.getCurrentTicketForCustomer.mockReturnValue(throwError(() => ({status: 404})));
    distributionApiService.assignCustomer.mockReturnValue(of(undefined));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    component.ticketNumberInput.set(55);
    component.assignTicket();

    expect(distributionApiService.assignCustomer).toHaveBeenCalledWith(mockCustomer.id, 55, expect.anything());
    expect(component.ticketNumber()).toBe(55);
    expect(component.ticketNumberInput()).toBeNull();
    expect(toastr.success).toHaveBeenCalledWith('Ticket wurde zugewiesen!');
  });

  it('delete ticket calls API correctly and clears ticket number', async () => {
    currentDistributionSignal.set({id: 1, startedAt: new Date()});
    distributionTicketApiService.getCurrentTicketForCustomer.mockReturnValue(of({ticketNumber: 42}));
    distributionTicketApiService.deleteCurrentTicketOfCustomer.mockReturnValue(of(undefined));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.ticketNumber()).toBe(42);

    component.deleteTicket();

    expect(distributionTicketApiService.deleteCurrentTicketOfCustomer).toHaveBeenCalledWith(mockCustomer.id, expect.anything());
    expect(component.ticketNumber()).toBeNull();
    expect(toastr.success).toHaveBeenCalledWith('Ticket wurde gelöscht!');
  });

  it('openConfirmUpdateCustomerDialog opens dialog with correct message', () => {
    const mockMessage = 'Customer has been updated by another user. Do you want to proceed?';

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({
      afterClosed: vi.fn().mockReturnValue(of(true))
    } as any);

    component.openConfirmUpdateCustomerDialog(mockCustomer, mockMessage, 'Kunde wurde verlängert!', 'Verlängerung fehlgeschlagen!');

    expect(matDialog.open).toHaveBeenCalledWith(ConfirmCustomerSaveDialog, {
      data: {
        message: mockMessage
      }
    });
  });

  it('openConfirmUpdateCustomerDialog calls API with force=true when confirmed', () => {
    const mockMessage = 'Customer has been updated by another user. Do you want to proceed?';
    customerApiService.updateCustomer.mockReturnValue(of(mockUpdateSuccessResponse));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({
      afterClosed: vi.fn().mockReturnValue(of(true))
    } as any);

    component.openConfirmUpdateCustomerDialog(mockCustomer, mockMessage, 'Kunde wurde verlängert!', 'Verlängerung fehlgeschlagen!');

    expect(matDialog.open).toHaveBeenCalledWith(ConfirmCustomerSaveDialog, {
      data: {
        message: mockMessage
      }
    });
    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(mockCustomer, true, expect.anything());
    expect(toastr.success).toHaveBeenCalledWith('Kunde wurde verlängert!');
  });

  it('openConfirmUpdateCustomerDialog shows the given error title when the retry itself fails', () => {
    const mockMessage = 'Customer has been updated by another user. Do you want to proceed?';
    customerApiService.updateCustomer.mockReturnValue(throwError(() => ({
      status: 500,
      error: { detail: 'Internal server error' }
    })));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({
      afterClosed: vi.fn().mockReturnValue(of(true))
    } as any);

    component.openConfirmUpdateCustomerDialog(mockCustomer, mockMessage, 'Kunde wurde gesperrt!', 'Sperren fehlgeschlagen!');

    expect(toastr.error).toHaveBeenCalledWith('Internal server error', 'Sperren fehlgeschlagen!');
  });

  it('openConfirmUpdateCustomerDialog does not call API when dialog is cancelled', () => {
    const mockMessage = 'Customer has been updated by another user. Do you want to proceed?';

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({
      afterClosed: vi.fn().mockReturnValue(of(false))
    } as any);

    component.openConfirmUpdateCustomerDialog(mockCustomer, mockMessage, 'Kunde wurde verlängert!', 'Verlängerung fehlgeschlagen!');

    expect(matDialog.open).toHaveBeenCalled();
    expect(customerApiService.updateCustomer).not.toHaveBeenCalled();
  });

  it('prolong customer with 409 conflict shows confirmation dialog', () => {
    const expectedCustomerData = {
      ...mockCustomer,
      validUntil: dayjs(mockCustomer.validUntil).add(3, 'months').endOf('day').toDate()
    };

    customerApiService.updateCustomer.mockReturnValue(throwError(() => ({
      status: 409,
      error: {
        detail: 'Conflict: customer was updated by another user',
        body: { data: mockCustomer, errorMsg: 'Conflict: customer was updated by another user' }
      }
    })));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.prolongCustomer(3);

    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData, false, expect.anything());
  });

  it('prolong customer with non-409 error shows error toast', () => {
    const expectedCustomerData = {
      ...mockCustomer,
      validUntil: dayjs(mockCustomer.validUntil).add(3, 'months').endOf('day').toDate()
    };

    customerApiService.updateCustomer.mockReturnValue(throwError(() => ({
      status: 500,
      error: { detail: 'Internal server error' }
    })));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.prolongCustomer(3);

    expect(customerApiService.updateCustomer).toHaveBeenCalledWith(expectedCustomerData, false, expect.anything());
    expect(toastr.error).toHaveBeenCalledWith('Internal server error', 'Verlängerung fehlgeschlagen!');
  });

  it('upload document to customer', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', {items: []});
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const resultDocument = mockCustomerDocumentsResponse.items[0];
    customerDocumentApiService.uploadDocument.mockReturnValue(of(resultDocument));

    const file = new File(['content'], 'proof.pdf');
    component.onDocumentUpload({mode: 'upload', documentType: DocumentType.PROOF_OF_INCOME, file});

    expect(customerDocumentApiService.uploadDocument).toHaveBeenCalledWith(
      mockCustomer.id, DocumentType.PROOF_OF_INCOME, file
    );
    expect(component.customerDocuments()[0]).toEqual(resultDocument);
    expect(toastr.success).toHaveBeenCalledWith('Dokument wurde hochgeladen!');
  });

  it('import scanner document to customer', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', {items: []});
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const resultDocument = mockCustomerDocumentsResponse.items[0];
    customerDocumentApiService.importScannerDocument.mockReturnValue(of(resultDocument));

    component.onDocumentUpload({mode: 'scanner', documentType: DocumentType.OTHER, fileName: 'scan1.pdf'});

    expect(customerDocumentApiService.importScannerDocument).toHaveBeenCalledWith(
      mockCustomer.id, 'scan1.pdf', DocumentType.OTHER
    );
    expect(component.customerDocuments()[0]).toEqual(resultDocument);
  });

  it('download document', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const blob = new Blob(['content']);
    customerDocumentApiService.downloadDocument.mockReturnValue(of(new HttpResponse({body: blob})));

    const document = mockCustomerDocumentsResponse.items[0];
    component.downloadDocument(document);

    expect(customerDocumentApiService.downloadDocument).toHaveBeenCalledWith(mockCustomer.id, document.id);
    expect(fileHelperService.downloadFile).toHaveBeenCalledWith(document.fileName, blob);
  });

  it('delete document from customer', () => {
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({afterClosed: () => of(true)} as any);

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    customerDocumentApiService.deleteDocument.mockReturnValue(of(undefined));

    const document = mockCustomerDocumentsResponse.items[0];
    component.openDeleteDocumentDialog(document);

    expect(customerDocumentApiService.deleteDocument).toHaveBeenCalledWith(mockCustomer.id, document.id);
    expect(component.customerDocuments()).toEqual([]);
    expect(toastr.success).toHaveBeenCalledWith('Dokument wurde gelöscht!');
  });

  it('hides the documents tab from a user without CUSTOMER_DOCUMENTS', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="documents-tab-label"]'))).toBeNull();
  });

  it('shows the documents tab for a user with CUSTOMER_DOCUMENTS', () => {
    const authenticationService = TestBed.inject(AuthenticationService);
    authenticationService.userInfo.set({username: 'tester', permissions: ['CUSTOMER_DOCUMENTS']});

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="documents-tab-label"]'))).not.toBeNull();
  });

  it('pay cost contribution - all', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const expectedCustomerData = {...mockCustomer, pendingCostContribution: 0};
    customerApiService.payCostContribution.mockReturnValue(of(expectedCustomerData));

    component.payCostContributionAll();

    expect(customerApiService.payCostContribution).toHaveBeenCalledWith(mockCustomer.id, undefined);
    expect(component.customerData()).toEqual(expectedCustomerData);
    expect(toastr.success).toHaveBeenCalledWith('Unkostenbeitrag wurde aktualisiert!');
  });

  it('pay cost contribution - specific amount via dialog', () => {
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({afterClosed: () => of(50)} as any);

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const expectedCustomerData = {...mockCustomer, pendingCostContribution: 73};
    customerApiService.payCostContribution.mockReturnValue(of(expectedCustomerData));

    component.openPayCostContributionDialog();

    expect(customerApiService.payCostContribution).toHaveBeenCalledWith(mockCustomer.id, 50);
    expect(component.customerData()).toEqual(expectedCustomerData);
  });

  it('edit cost contribution to an arbitrary amount via dialog', () => {
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({afterClosed: () => of(500)} as any);

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const expectedCustomerData = {...mockCustomer, pendingCostContribution: 500};
    customerApiService.editCostContribution.mockReturnValue(of(expectedCustomerData));

    component.openEditCostContributionDialog();

    expect(matDialog.open).toHaveBeenCalledWith(EditCostContributionDialogComponent, {
      data: {pendingAmount: mockCustomer.pendingCostContribution}
    });
    expect(customerApiService.editCostContribution).toHaveBeenCalledWith(mockCustomer.id, 500);
    expect(component.customerData()).toEqual(expectedCustomerData);
    expect(toastr.success).toHaveBeenCalledWith('Unkostenbeitrag wurde aktualisiert!');
  });

  it('edit cost contribution to zero via dialog', () => {
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({afterClosed: () => of(0)} as any);

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const expectedCustomerData = {...mockCustomer, pendingCostContribution: 0};
    customerApiService.editCostContribution.mockReturnValue(of(expectedCustomerData));

    component.openEditCostContributionDialog();

    expect(customerApiService.editCostContribution).toHaveBeenCalledWith(mockCustomer.id, 0);
    expect(component.customerData()).toEqual(expectedCustomerData);
  });

  it('edit cost contribution dialog cancelled does not call API', () => {
    const matDialog = TestBed.inject(MatDialog) as MockedObject<MatDialog>;
    matDialog.open.mockReturnValue({afterClosed: () => of(undefined)} as any);

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    fixture.componentRef.setInput('customerData', mockCustomer);
    fixture.componentRef.setInput('customerNotesResponse', mockCustomerNotesResponse);
    fixture.componentRef.setInput('customerDocumentsResponse', mockCustomerDocumentsResponse);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.openEditCostContributionDialog();

    expect(customerApiService.editCostContribution).not.toHaveBeenCalled();
  });

  function getTextByTestId(fixture: ComponentFixture<CustomerDetailComponent>, testId: string): string {
    const element = fixture.debugElement.query(By.css(`[testid="${testId}"]`));
    if (!element) {
      throw new Error(`Element with testid="${testId}" not found`);
    }
    return element.nativeElement.textContent;
  }

});
