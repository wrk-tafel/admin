import {TestBed, waitForAsync} from '@angular/core/testing';
import {CheckinComponent, CustomerState} from './checkin.component';
import {WebsocketService} from '../../../common/websocket/websocket.service';
import {CommonModule} from '@angular/common';
import {CustomerApiService} from '../../../api/customer-api.service';
import {BehaviorSubject, of, throwError} from 'rxjs';
import {IMessage} from '@stomp/stompjs';
import * as moment from 'moment/moment';
import {ScannerList, ScanResult} from '../scanner/scanner.component';
import {CustomerNoteApiService, CustomerNotesResponse} from '../../../api/customer-note-api.service';
import {GlobalStateService} from '../../../common/state/global-state.service';
import {Router} from '@angular/router';
import {DistributionItem} from '../../../api/distribution-api.service';

describe('CheckinComponent', () => {
  let customerApiService: jasmine.SpyObj<CustomerApiService>;
  let customerNoteApiService: jasmine.SpyObj<CustomerNoteApiService>;
  let wsService: jasmine.SpyObj<WebsocketService>;
  let globalStateService: jasmine.SpyObj<GlobalStateService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(waitForAsync(() => {
    const customerApiServiceSpy = jasmine.createSpyObj('CustomerApiService', ['getCustomer']);
    const customerNoteApiServiceSpy = jasmine.createSpyObj('CustomerNoteApiService', ['getNotesForCustomer']);
    const wsServiceSpy = jasmine.createSpyObj('WebsocketService',
      ['init', 'connect', 'watch', 'close']
    );
    const globalStateServiceSpy = jasmine.createSpyObj('GlobalStateService', ['getCurrentDistribution']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [CommonModule],
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
          provide: Router,
          useValue: routerSpy
        }
      ]
    }).compileComponents();

    customerApiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
    customerNoteApiService = TestBed.inject(CustomerNoteApiService) as jasmine.SpyObj<CustomerNoteApiService>;
    wsService = TestBed.inject(WebsocketService) as jasmine.SpyObj<WebsocketService>;
    globalStateService = TestBed.inject(GlobalStateService) as jasmine.SpyObj<GlobalStateService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
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

    wsService.watch.and.returnValue(of());
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
    customerApiService.getCustomer.and.returnValue(of());
    customerNoteApiService.getNotesForCustomer.and.returnValue(of());

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
    expect(component.customerId).toBeUndefined();
    expect(component.scannerReadyState).toBeFalsy();
    expect(testSubscription.unsubscribe).toHaveBeenCalled();
    expect(wsService.watch).not.toHaveBeenCalled();
    expect(customerApiService.getCustomer).not.toHaveBeenCalled();
  });

  it('selectedScannerId switch to another scanner', () => {
    const testSubscription = jasmine.createSpyObj('Subscription', ['unsubscribe']);
    wsService.watch.and.returnValue(of());

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
    component.errorMessage = 'test msg to be purged';

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

    component.searchForCustomerId();

    expect(component.customer).toEqual(mockCustomer);
    expect(customerApiService.getCustomer).toHaveBeenCalledWith(mockCustomer.id);
    expect(component.errorMessage).toBeUndefined();

    expect(component.customerState).toBe(CustomerState.GREEN);
    expect(component.customerStateText).toBe('GÜLTIG');
  });

  it('searchForCustomerId found valid customer but expires soon', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;

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

    component.searchForCustomerId();

    expect(component.customer).toEqual(mockCustomer);
    expect(customerApiService.getCustomer).toHaveBeenCalledWith(mockCustomer.id);

    expect(component.customerState).toBe(CustomerState.YELLOW);
    expect(component.customerStateText).toBe('GÜLTIG - läuft bald ab');
  });

  it('searchForCustomerId found invalid customer', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;

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

    component.searchForCustomerId();

    expect(component.customer).toEqual(mockCustomer);
    expect(customerApiService.getCustomer).toHaveBeenCalledWith(mockCustomer.id);

    expect(component.customerState).toBe(CustomerState.RED);
    expect(component.customerStateText).toBe('UNGÜLTIG');
  });

  it('searchForCustomerId customer not found', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;

    customerApiService.getCustomer.and.returnValue(throwError({status: 404}));
    const notesResponse: CustomerNotesResponse = {notes: []};
    customerNoteApiService.getNotesForCustomer.and.returnValue(of(notesResponse));
    const testCustomerId = 1234;
    component.customerId = testCustomerId;

    component.searchForCustomerId();

    expect(component.customer).toBeUndefined();
    expect(customerApiService.getCustomer).toHaveBeenCalledWith(testCustomerId);
    expect(component.errorMessage).toBe(`Kundennummer ${testCustomerId} nicht gefunden!`);
  });

  it('searchForCustomerId found notes', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;

    customerApiService.getCustomer.and.returnValue(of());

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

    component.searchForCustomerId();

    expect(component.customerNotes).toEqual(mockNotes);
  });

  it('reset customer', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;

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

    component.resetCustomer();

    expect(component.customerId).toBeUndefined();
    expect(component.customerState).toBeUndefined();
    expect(component.customerStateText).toBeUndefined();
    expect(component.customerNotes).toBeDefined();
    expect(component.customerNotes.length).toBe(0);
  });

});
