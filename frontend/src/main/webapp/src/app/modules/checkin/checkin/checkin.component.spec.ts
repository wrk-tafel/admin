import {TestBed, waitForAsync} from '@angular/core/testing';
import {CheckinComponent} from './checkin.component';
import {WebsocketService} from '../../../common/websocket/websocket.service';
import {CommonModule} from '@angular/common';
import {CustomerApiService} from '../../../api/customer-api.service';
import {ScannerApiService, ScannerIdsResponse, ScanResult} from '../../../api/scanner-api.service';
import {RxStompState} from '@stomp/rx-stomp';
import {BehaviorSubject, of} from 'rxjs';
import {IMessage} from '@stomp/stompjs';

describe('CheckinComponent', () => {
  let customerApiService: jasmine.SpyObj<CustomerApiService>;
  let scannerApiService: jasmine.SpyObj<ScannerApiService>;
  let wsService: jasmine.SpyObj<WebsocketService>;

  beforeEach(waitForAsync(() => {
    const customerApiServiceSpy = jasmine.createSpyObj('CustomerApiService',
      ['TODO']
    );
    const scannerApiServiceSpy = jasmine.createSpyObj('ScannerApiService',
      ['getScannerIds']
    );
    const wsServiceSpy = jasmine.createSpyObj('WebsocketService',
      ['init', 'connect', 'getConnectionState', 'watch', 'close']
    );

    TestBed.configureTestingModule({
      imports: [CommonModule],
      providers: [
        {
          provide: CustomerApiService,
          useValue: customerApiServiceSpy
        },
        {
          provide: ScannerApiService,
          useValue: scannerApiServiceSpy
        },
        {
          provide: WebsocketService,
          useValue: wsServiceSpy
        }
      ]
    }).compileComponents();

    customerApiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
    scannerApiService = TestBed.inject(ScannerApiService) as jasmine.SpyObj<ScannerApiService>;
    wsService = TestBed.inject(WebsocketService) as jasmine.SpyObj<WebsocketService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('ngOnInit', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;
    wsService.getConnectionState.and.returnValue(new BehaviorSubject(RxStompState.OPEN));

    const scannerIdsResponse: ScannerIdsResponse = {scannerIds: [1, 2, 3]};
    scannerApiService.getScannerIds.and.returnValue(of(scannerIdsResponse));

    component.ngOnInit();

    expect(wsService.getConnectionState).toHaveBeenCalled();
    expect(wsService.init).toHaveBeenCalled();
    expect(wsService.connect).toHaveBeenCalled();
    expect(component.scannerIds).toEqual(scannerIdsResponse.scannerIds);
  });

  it('processWsConnectionState OPEN', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;
    component.wsApiClientReady = false;

    component.processWsConnectionState(RxStompState.OPEN);

    expect(component.wsApiClientReady).toBeTruthy();
  });

  it('processWsConnectionState CLOSED', () => {
    const fixture = TestBed.createComponent(CheckinComponent);
    const component = fixture.componentInstance;
    component.wsApiClientReady = true;

    component.processWsConnectionState(RxStompState.CLOSED);

    expect(component.wsApiClientReady).toBeFalsy();
  });

  it('selectedScannerId first time selected', () => {
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

});
