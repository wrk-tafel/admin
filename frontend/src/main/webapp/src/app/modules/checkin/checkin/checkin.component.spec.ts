import {TestBed, waitForAsync} from '@angular/core/testing';
import {CheckinComponent, CustomerState} from './checkin.component';
import {WebsocketService} from '../../../common/websocket/websocket.service';
import {CommonModule} from '@angular/common';
import {CustomerApiService} from '../../../api/customer-api.service';
import {BehaviorSubject, EMPTY, of, throwError} from 'rxjs';
import {IMessage} from '@stomp/stompjs';
import * as moment from 'moment/moment';
import {ScannerList, ScanResult} from '../scanner/scanner.component';
import {CustomerNoteApiService, CustomerNotesResponse} from '../../../api/customer-note-api.service';
import {GlobalStateService} from '../../../common/state/global-state.service';
import {Router} from '@angular/router';
import {DistributionApiService, DistributionItem} from '../../../api/distribution-api.service';
import {RouterTestingModule} from '@angular/router/testing';
import {BadgeModule, CardModule, ColComponent, ModalModule, RowComponent} from '@coreui/angular';
import {FormsModule} from '@angular/forms';
import {ChangeDetectorRef, ElementRef} from '@angular/core';
import {ToastService, ToastType} from '../../../common/views/default-layout/toasts/toast.service';
import {DistributionTicketApiService} from '../../../api/distribution-ticket-api.service';

describe('CheckinComponent', () => {
  let customerApiService: jasmine.SpyObj<CustomerApiService>;
  let customerNoteApiService: jasmine.SpyObj<CustomerNoteApiService>;
  let wsService: jasmine.SpyObj<WebsocketService>;
  let globalStateService: jasmine.SpyObj<GlobalStateService>;
  let distributionApiService: jasmine.SpyObj<DistributionApiService>;
  let distributionTicketApiService: jasmine.SpyObj<DistributionTicketApiService>;
  let router: jasmine.SpyObj<Router>;
  let toastService: jasmine.SpyObj<ToastService>;

  beforeEach(waitForAsync(() => {
    const customerApiServiceSpy = jasmine.createSpyObj('CustomerApiService', ['getCustomer']);
    const customerNoteApiServiceSpy = jasmine.createSpyObj('CustomerNoteApiService', ['getNotesForCustomer']);
    const wsServiceSpy = jasmine.createSpyObj('WebsocketService',
      ['init', 'connect', 'watch', 'close']
    );
    const globalStateServiceSpy = jasmine.createSpyObj('GlobalStateService', ['getCurrentDistribution']);
    const distributionApiServiceSpy = jasmine.createSpyObj('DistributionApiService', ['assignCustomer']);
    const distributionTicketApiServiceSpy = jasmine.createSpyObj('DistributionTicketApiService', ['getCurrentTicketForCustomer', 'deleteCurrentTicketOfCustomer']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const toastServiceSpy = jasmine.createSpyObj('ToastService', ['showToast']);

    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        RouterTestingModule,
        FormsModule,
        ModalModule,
        RowComponent,
        ColComponent,
        CardModule,
        BadgeModule
      ],
      declarations: [CheckinComponent],
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
          provide: WebsocketService,
          useValue: wsServiceSpy
        },
        {
          provide: GlobalStateService,
          useValue: globalStateServiceSpy
        },
        {
          provide: DistributionApiService,
          useValue: distributionApiServiceSpy
        },
        {
          provide: DistributionTicketApiService,
          useValue: distributionTicketApiServiceSpy
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
    wsService = TestBed.inject(WebsocketService) as jasmine.SpyObj<WebsocketService>;
    globalStateService = TestBed.inject(GlobalStateService) as jasmine.SpyObj<GlobalStateService>;
    distributionApiService = TestBed.inject(DistributionApiService) as jasmine.SpyObj<DistributionApiService>;
    distributionTicketApiService = TestBed.inject(DistributionTicketApiService) as jasmine.SpyObj<DistributionTicketApiService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });

  it('ngOnInit', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;

    const scannersResponse: ScannerList = {scannerIds: [1, 2, 3]};
    const scannersMessage: IMessage = {
      body: JSON.stringify(scannersResponse),
      ack: null,
      nack: null,
      headers: null,
      command: null,
      binaryBody: null,
      isBinaryBody: false
    };
    wsService.watch.and.returnValue(of(scannersMessage));

    const testDistribution = {
      id: 123,
      state: {
        name: 'OPEN',
        stateLabel: 'Offen',
        actionLabel: 'Offen'
      }
    };
    globalStateService.getCurrentDistribution.and.returnValue(new BehaviorSubject<DistributionItem>(testDistribution));

    component.ngOnInit();

    expect(wsService.watch).toHaveBeenCalledWith('/topic/scanners');
    expect(component.scannerIds).toEqual(scannersResponse.scannerIds);
  });

  it('ngOnInit without ongoing distribution navigates to dashboard', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;

    wsService.watch.and.returnValue(EMPTY);
    globalStateService.getCurrentDistribution.and.returnValue(new BehaviorSubject<DistributionItem>(null));

    component.ngOnInit();

    expect(router.navigate).toHaveBeenCalledWith(['uebersicht']);
  });

  it('ngOnDestroy with active subscription', () => {
    const testSubscription = jasmine.createSpyObj('Subscription', ['unsubscribe']);

    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;
    component.scannerSubscription = testSubscription;

    component.ngOnDestroy();

    expect(component.scannerSubscription.unsubscribe).toHaveBeenCalled();
  });

  it('selectedScannerId first time selected', () => {
    customerApiService.getCustomer.and.returnValue(EMPTY);
    customerNoteApiService.getNotesForCustomer.and.returnValue(EMPTY);

    const customerId = 11111;
    const scanResult: ScanResult = {value: customerId};
    const scanResultMessage: IMessage = {
      body: JSON.stringify(scanResult),
      ack: null,
      nack: null,
      headers: null,
      command: null,
      binaryBody: null,
      isBinaryBody: false
    };
    wsService.watch.and.returnValue(of(scanResultMessage));

    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;

    expect(component.currentScannerId).toBeUndefined();
    expect(component.customerId).toBeUndefined();
    expect(component.scannerReadyState).toBeFalsy();

    const newScannerId = 123;
    component.selectedScannerId = newScannerId;

    expect(component.currentScannerId).toBe(newScannerId);
    expect(component.customerId).toBe(customerId);
    expect(component.scannerReadyState).toBeTruthy();
    expect(wsService.watch).toHaveBeenCalledWith(`/topic/scanners/${newScannerId}/results`);
    expect(customerApiService.getCustomer).toHaveBeenCalled();
  });

  it('selectedScannerId removed scanner', () => {
    const testSubscription = jasmine.createSpyObj('Subscription', ['unsubscribe']);

    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;
    component.currentScannerId = 123;
    component.customerId = 1111;
    component.scannerReadyState = true;
    component.scannerSubscription = testSubscription;

    component.selectedScannerId = undefined;

    expect(component.currentScannerId).toBeUndefined();
    expect(component.customerId).not.toBeUndefined();
    expect(component.scannerReadyState).toBeFalsy();
    expect(testSubscription.unsubscribe).toHaveBeenCalled();
    expect(wsService.watch).not.toHaveBeenCalled();
    expect(customerApiService.getCustomer).not.toHaveBeenCalled();
  });

  it('selectedScannerId switch to another scanner', () => {
    const testSubscription = jasmine.createSpyObj('Subscription', ['unsubscribe']);
    wsService.watch.and.returnValue(EMPTY);

    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;
    component.currentScannerId = 123;
    component.customerId = 1111;
    component.scannerReadyState = true;
    component.scannerSubscription = testSubscription;

    const newScannerId = 456;
    component.selectedScannerId = newScannerId;

    expect(component.currentScannerId).toBe(newScannerId);
    expect(component.scannerReadyState).toBeTruthy();
    expect(testSubscription.unsubscribe).toHaveBeenCalled();
    expect(wsService.watch).toHaveBeenCalled();
  });

  it('searchForCustomerId found valid customer', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;
    component.ticketNumber = 123;
    component.ticketNumberInputRef = new ElementRef({
      /* eslint-disable @typescript-eslint/no-empty-function */
      focus() {
      }
    });
    spyOn(component.ticketNumberInputRef.nativeElement, 'focus');

    const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
    spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

    const mockCustomer = {
      id: 133,
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),

      address: {
        street: 'Teststraße',
        houseNumber: '123A',
        door: '21',
        postalCode: 1020,
        city: 'Wien',
      },

      employer: 'test employer',
      income: 1000,

      validUntil: moment().add(3, 'months').startOf('day').utc().toDate()
    };
    customerApiService.getCustomer.and.returnValue(of(mockCustomer));
    const notesResponse: CustomerNotesResponse = {notes: []};
    customerNoteApiService.getNotesForCustomer.and.returnValue(of(notesResponse));
    component.customerId = mockCustomer.id;
    distributionTicketApiService.getCurrentTicketForCustomer.and.returnValue(of({ticketNumber: null}));

    component.searchForCustomerId();

    expect(component.customer).toEqual(mockCustomer);
    expect(customerApiService.getCustomer).toHaveBeenCalledWith(mockCustomer.id);

    expect(component.customerState).toBe(CustomerState.GREEN);
    expect(component.customerStateText).toBe('GÜLTIG');

    expect(component.ticketNumber).toBeUndefined();
    expect(component.ticketNumberEdit).toBeFalse();
    expect(component.ticketNumberInputRef.nativeElement.focus).toHaveBeenCalled();
  });

  it('searchForCustomerId found valid customer with assigned ticket', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;
    component.ticketNumber = 123;
    component.ticketNumberInputRef = new ElementRef({
      /* eslint-disable @typescript-eslint/no-empty-function */
      focus() {
      }
    });
    spyOn(component.ticketNumberInputRef.nativeElement, 'focus');

    const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
    spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

    const mockCustomer = {
      id: 133,
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),

      address: {
        street: 'Teststraße',
        houseNumber: '123A',
        door: '21',
        postalCode: 1020,
        city: 'Wien',
      },

      employer: 'test employer',
      income: 1000,

      validUntil: moment().add(3, 'months').startOf('day').utc().toDate()
    };
    customerApiService.getCustomer.and.returnValue(of(mockCustomer));
    const notesResponse: CustomerNotesResponse = {notes: []};
    customerNoteApiService.getNotesForCustomer.and.returnValue(of(notesResponse));
    component.customerId = mockCustomer.id;

    const testTicketNumber = 123;
    distributionTicketApiService.getCurrentTicketForCustomer.and.returnValue(of({ticketNumber: testTicketNumber}));

    component.searchForCustomerId();

    expect(component.customer).toEqual(mockCustomer);
    expect(customerApiService.getCustomer).toHaveBeenCalledWith(mockCustomer.id);

    expect(component.customerState).toBe(CustomerState.GREEN);
    expect(component.customerStateText).toBe('GÜLTIG');

    expect(component.ticketNumber).toBe(testTicketNumber);
    expect(component.ticketNumberEdit).toBeTrue();
    expect(component.ticketNumberInputRef.nativeElement.focus).toHaveBeenCalled();
  });

  it('searchForCustomerId found valid customer but expires soon', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;
    component.ticketNumberInputRef = new ElementRef({
      /* eslint-disable @typescript-eslint/no-empty-function */
      focus() {
      }
    });
    spyOn(component.ticketNumberInputRef.nativeElement, 'focus');

    const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
    spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

    const mockCustomer = {
      id: 133,
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),

      address: {
        street: 'Teststraße',
        houseNumber: '123A',
        door: '21',
        postalCode: 1020,
        city: 'Wien',
      },

      employer: 'test employer',
      income: 1000,

      validUntil: moment().add(2, 'weeks').startOf('day').utc().toDate()
    };
    customerApiService.getCustomer.and.returnValue(of(mockCustomer));
    const notesResponse: CustomerNotesResponse = {notes: []};
    customerNoteApiService.getNotesForCustomer.and.returnValue(of(notesResponse));
    component.customerId = mockCustomer.id;
    distributionTicketApiService.getCurrentTicketForCustomer.and.returnValue(of({ticketNumber: null}));

    component.searchForCustomerId();

    expect(component.customer).toEqual(mockCustomer);
    expect(customerApiService.getCustomer).toHaveBeenCalledWith(mockCustomer.id);

    expect(component.customerState).toBe(CustomerState.YELLOW);
    expect(component.customerStateText).toBe('GÜLTIG - läuft bald ab');
    expect(component.ticketNumberInputRef.nativeElement.focus).toHaveBeenCalled();
  });

  it('searchForCustomerId found invalid customer', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;
    component.ticketNumberInputRef = new ElementRef({
      /* eslint-disable @typescript-eslint/no-empty-function */
      focus() {
      }
    });
    spyOn(component.ticketNumberInputRef.nativeElement, 'focus');
    component.cancelButtonRef = new ElementRef({
      /* eslint-disable @typescript-eslint/no-empty-function */
      focus() {
      }
    });
    spyOn(component.cancelButtonRef.nativeElement, 'focus');

    const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
    spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

    const mockCustomer = {
      id: 133,
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),

      address: {
        street: 'Teststraße',
        houseNumber: '123A',
        door: '21',
        postalCode: 1020,
        city: 'Wien',
      },

      employer: 'test employer',
      income: 1000,

      validUntil: moment().subtract(2, 'weeks').startOf('day').utc().toDate()
    };
    customerApiService.getCustomer.and.returnValue(of(mockCustomer));
    const notesResponse: CustomerNotesResponse = {notes: []};
    customerNoteApiService.getNotesForCustomer.and.returnValue(of(notesResponse));
    component.customerId = mockCustomer.id;
    distributionTicketApiService.getCurrentTicketForCustomer.and.returnValue(of({ticketNumber: null}));

    component.searchForCustomerId();

    expect(component.customer).toEqual(mockCustomer);
    expect(customerApiService.getCustomer).toHaveBeenCalledWith(mockCustomer.id);

    expect(component.customerState).toBe(CustomerState.RED);
    expect(component.customerStateText).toBe('UNGÜLTIG');
    expect(component.ticketNumberInputRef.nativeElement.focus).not.toHaveBeenCalled();
    expect(component.cancelButtonRef.nativeElement.focus).toHaveBeenCalled();
  });

  it('searchForCustomerId found locked customer', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;
    component.ticketNumberInputRef = new ElementRef({
      /* eslint-disable @typescript-eslint/no-empty-function */
      focus() {
      }
    });
    spyOn(component.ticketNumberInputRef.nativeElement, 'focus');
    component.cancelButtonRef = new ElementRef({
      /* eslint-disable @typescript-eslint/no-empty-function */
      focus() {
      }
    });
    spyOn(component.cancelButtonRef.nativeElement, 'focus');

    const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
    spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

    const mockCustomer = {
      id: 133,
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),

      address: {
        street: 'Teststraße',
        houseNumber: '123A',
        door: '21',
        postalCode: 1020,
        city: 'Wien',
      },

      employer: 'test employer',
      income: 1000,
      locked: true,

      validUntil: moment().subtract(2, 'weeks').startOf('day').utc().toDate()
    };
    customerApiService.getCustomer.and.returnValue(of(mockCustomer));
    const notesResponse: CustomerNotesResponse = {notes: []};
    customerNoteApiService.getNotesForCustomer.and.returnValue(of(notesResponse));
    component.customerId = mockCustomer.id;
    distributionTicketApiService.getCurrentTicketForCustomer.and.returnValue(of({ticketNumber: null}));

    component.searchForCustomerId();

    expect(component.customer).toEqual(mockCustomer);
    expect(customerApiService.getCustomer).toHaveBeenCalledWith(mockCustomer.id);

    expect(component.customerState).toBe(CustomerState.RED);
    expect(component.customerStateText).toBe('GESPERRT');
    expect(component.ticketNumberInputRef.nativeElement.focus).not.toHaveBeenCalled();
    expect(component.cancelButtonRef.nativeElement.focus).toHaveBeenCalled();
  });

  it('searchForCustomerId customer not found', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;

    customerApiService.getCustomer.and.returnValue(throwError(() => {
      return {status: 404};
    }));
    const notesResponse: CustomerNotesResponse = {notes: []};
    customerNoteApiService.getNotesForCustomer.and.returnValue(of(notesResponse));
    const testCustomerId = 1234;
    component.customerId = testCustomerId;

    component.searchForCustomerId();

    expect(component.customer).toBeUndefined();
    expect(customerApiService.getCustomer).toHaveBeenCalledWith(testCustomerId);
  });

  it('searchForCustomerId found notes', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;
    component.ticketNumberInputRef = new ElementRef({
      /* eslint-disable @typescript-eslint/no-empty-function */
      focus() {
      }
    });
    spyOn(component.ticketNumberInputRef.nativeElement, 'focus');

    const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
    spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

    const mockCustomer = {
      id: 133,
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),

      address: {
        street: 'Teststraße',
        houseNumber: '123A',
        door: '21',
        postalCode: 1020,
        city: 'Wien',
      },

      employer: 'test employer',
      income: 1000,

      validUntil: moment().add(3, 'months').startOf('day').utc().toDate()
    };
    customerApiService.getCustomer.and.returnValue(of(mockCustomer));

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
    const notesResponse: CustomerNotesResponse = {notes: mockNotes};
    customerNoteApiService.getNotesForCustomer.and.returnValue(of(notesResponse));
    distributionTicketApiService.getCurrentTicketForCustomer.and.returnValue(of({ticketNumber: null}));

    component.searchForCustomerId();

    expect(component.customerNotes).toEqual(mockNotes);
  });

  it('reset customer', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;
    component.ticketNumberInputRef = new ElementRef({
      /* eslint-disable @typescript-eslint/no-empty-function */
      focus() {
      }
    });
    spyOn(component.ticketNumberInputRef.nativeElement, 'focus');
    component.customerIdInputRef = new ElementRef({
      /* eslint-disable @typescript-eslint/no-empty-function */
      focus() {
      }
    });
    spyOn(component.customerIdInputRef.nativeElement, 'focus');

    const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
    spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

    const mockCustomer = {
      id: 133,
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),

      address: {
        street: 'Teststraße',
        houseNumber: '123A',
        door: '21',
        postalCode: 1020,
        city: 'Wien',
      },

      employer: 'test employer',
      income: 1000,

      validUntil: moment().add(3, 'months').startOf('day').utc().toDate()
    };
    component.processCustomer(mockCustomer);

    component.cancel();

    expect(component.customerId).toBeUndefined();
    expect(component.customerState).toBeUndefined();
    expect(component.customerStateText).toBeUndefined();
    expect(component.customerNotes).toBeDefined();
    expect(component.customerNotes.length).toBe(0);
    expect(component.customerIdInputRef.nativeElement.focus).toHaveBeenCalled();
  });

  it('assign customer', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;
    component.ticketNumberInputRef = new ElementRef({
      /* eslint-disable @typescript-eslint/no-empty-function */
      focus() {
      }
    });
    spyOn(component.ticketNumberInputRef.nativeElement, 'focus');
    component.customerIdInputRef = new ElementRef({
      /* eslint-disable @typescript-eslint/no-empty-function */
      focus() {
      }
    });
    spyOn(component.customerIdInputRef.nativeElement, 'focus');

    const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
    spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

    const mockCustomer = {
      id: 133,
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),

      address: {
        street: 'Teststraße',
        houseNumber: '123A',
        door: '21',
        postalCode: 1020,
        city: 'Wien',
      },

      employer: 'test employer',
      income: 1000,

      validUntil: moment().add(3, 'months').startOf('day').utc().toDate()
    };
    component.processCustomer(mockCustomer);

    const ticketNumber = 55;
    component.ticketNumber = ticketNumber;

    distributionApiService.assignCustomer.and.returnValue(of(null));

    component.assignCustomer();

    expect(distributionApiService.assignCustomer).toHaveBeenCalledWith(mockCustomer.id, ticketNumber);

    expect(component.customerId).toBeUndefined();
    expect(component.customerState).toBeUndefined();
    expect(component.customerStateText).toBeUndefined();
    expect(component.customerNotes).toBeDefined();
    expect(component.customerNotes.length).toBe(0);
    expect(component.ticketNumber).toBeUndefined();
    expect(component.customerIdInputRef.nativeElement.focus).toHaveBeenCalled();
  });

  it('assign customer ignored without proper value', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;
    component.ticketNumberInputRef = new ElementRef({
      /* eslint-disable @typescript-eslint/no-empty-function */
      focus() {
      }
    });
    spyOn(component.ticketNumberInputRef.nativeElement, 'focus');

    const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
    spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

    const mockCustomer = {
      id: 133,
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),

      address: {
        street: 'Teststraße',
        houseNumber: '123A',
        door: '21',
        postalCode: 1020,
        city: 'Wien',
      },

      employer: 'test employer',
      income: 1000,

      validUntil: moment().add(3, 'months').startOf('day').utc().toDate()
    };
    component.processCustomer(mockCustomer);

    component.ticketNumber = undefined;

    component.assignCustomer();

    expect(distributionApiService.assignCustomer).not.toHaveBeenCalled();
  });

  it('delete ticket successful', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;
    component.ticketNumberInputRef = new ElementRef({
      /* eslint-disable @typescript-eslint/no-empty-function */
      focus() {
      }
    });
    spyOn(component.ticketNumberInputRef.nativeElement, 'focus');

    const changeDetectorRef = fixture.debugElement.injector.get(ChangeDetectorRef);
    spyOn(changeDetectorRef.constructor.prototype, 'detectChanges');

    const mockCustomer = {
      id: 133,
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),

      address: {
        street: 'Teststraße',
        houseNumber: '123A',
        door: '21',
        postalCode: 1020,
        city: 'Wien',
      },

      employer: 'test employer',
      income: 1000,

      validUntil: moment().add(3, 'months').startOf('day').utc().toDate()
    };
    component.processCustomer(mockCustomer);
    distributionTicketApiService.deleteCurrentTicketOfCustomer.and.returnValue(of(null));

    component.deleteTicket();

    expect(distributionTicketApiService.deleteCurrentTicketOfCustomer).toHaveBeenCalledWith(mockCustomer.id);
    expect(component.ticketNumber).toBeUndefined();
    expect(component.ticketNumberEdit).toBeUndefined();
    expect(toastService.showToast).toHaveBeenCalledWith({type: ToastType.SUCCESS, title: 'Ticket-Nummer gelöscht!'});
    expect(component.ticketNumberInputRef.nativeElement.focus).toHaveBeenCalled();
  });

});
