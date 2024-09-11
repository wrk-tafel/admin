import {fakeAsync, TestBed, tick, waitForAsync} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {ScannerComponent, ScannerRegistration} from './scanner.component';
import {QRCodeReaderService} from '../qrcode-reader/qrcode-reader.service';
import {CameraDevice} from 'html5-qrcode/esm/camera/core';
import {BehaviorSubject, of} from 'rxjs';
import {RxStompState} from '@stomp/rx-stomp';
import {WebsocketService} from '../../../common/websocket/websocket.service';
import {IMessage} from '@stomp/stompjs';

describe('ScannerComponent', () => {
  let wsService: jasmine.SpyObj<WebsocketService>;
  let qrCodeReaderService: jasmine.SpyObj<QRCodeReaderService>;

  beforeEach(waitForAsync(() => {
    const wsServiceSpy = jasmine.createSpyObj('WebsocketService',
      ['close', 'publish', 'getConnectionState', 'watch']
    );
    const qrCodeReaderServiceSpy = jasmine.createSpyObj('QRCodeReaderService', ['stop', 'saveCurrentCamera', 'restart', 'getCameras', 'getCurrentCamera', 'init', 'start']);

    TestBed.configureTestingModule({
      imports: [CommonModule],
      providers: [
        {
          provide: WebsocketService,
          useValue: wsServiceSpy
        },
        {
          provide: QRCodeReaderService,
          useValue: qrCodeReaderServiceSpy
        }
      ]
    }).compileComponents();

    wsService = TestBed.inject(WebsocketService) as jasmine.SpyObj<WebsocketService>;
    qrCodeReaderService = TestBed.inject(QRCodeReaderService) as jasmine.SpyObj<QRCodeReaderService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('ngOnInit', waitForAsync(async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    const testCamera1: CameraDevice = {id: 'cam1', label: 'Camera 1 Front'};
    const testCamera2: CameraDevice = {id: 'cam2', label: 'A camera 2 Back'};
    const testCameraList: CameraDevice[] = [testCamera1, testCamera2];
    qrCodeReaderService.getCameras.and.returnValue(Promise.resolve(testCameraList));
    qrCodeReaderService.getCurrentCamera.and.returnValue(testCamera2);
    qrCodeReaderService.start.and.returnValue(Promise.resolve(null));
    wsService.getConnectionState.and.returnValue(new BehaviorSubject(RxStompState.OPEN));
    const registration: ScannerRegistration = {scannerId: 123};
    const message: IMessage = {
      body: JSON.stringify(registration),
      ack: null,
      nack: null,
      headers: null,
      command: null,
      binaryBody: null,
      isBinaryBody: false
    };
    wsService.watch.and.returnValue(of(message));

    await component.ngOnInit();

    expect(component.apiClientReady()).toBeTruthy();
    expect(component.scannerId).toBe(registration.scannerId);

    expect(component.availableCameras).toEqual(testCameraList);
    expect(component.currentCamera).toEqual(testCamera2);
    expect(qrCodeReaderService.getCameras).toHaveBeenCalled();
    expect(qrCodeReaderService.getCurrentCamera).toHaveBeenCalled();
    expect(qrCodeReaderService.start).toHaveBeenCalled();
    expect(wsService.getConnectionState).toHaveBeenCalled();
    expect(wsService.publish).toHaveBeenCalledWith({destination: '/app/scanners/register'});
  }));

  it('ngOnDestroy calls stops scanner api and qrCodeReader', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    component.ngOnDestroy();

    expect(qrCodeReaderService.stop).toHaveBeenCalled();
  });

  it('processQrCodeReaderPromise fills state when successful', async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    component.qrCodeReaderReady.set(false);

    await component.processQrCodeReaderPromise(Promise.resolve(null));

    expect(component.qrCodeReaderReady()).toBe(true);
  });

  it('processQrCodeReaderPromise fills state when failed', async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    component.qrCodeReaderReady.set(true);

    await component.processQrCodeReaderPromise(Promise.reject());

    expect(component.qrCodeReaderReady()).toBe(false);
  });

  it('qrCodeReaderSuccessCallback received new text', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    const testValue = '12345';
    component.lastSentText = null;
    component.apiClientReady.set(true);
    component.scannerId = 111;

    component.qrCodeReaderSuccessCallback(testValue, undefined);

    expect(wsService.publish).toHaveBeenCalledWith({
      destination: '/topic/scanners/111/results',
      body: JSON.stringify({value: +testValue})
    });
    expect(component.lastSentText).toBe(testValue);
  });

  it('qrCodeReaderSuccessCallback and received the same text', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    const testText = 'test123';
    component.lastSentText = testText;
    component.apiClientReady.set(true);

    component.qrCodeReaderSuccessCallback(testText, undefined);

    expect(wsService.publish).not.toHaveBeenCalled();
    expect(component.lastSentText).toBe(testText);
  });

  it('qrCodeReaderSuccessCallback and received a different text', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    const testText = '12345';
    component.lastSentText = 'old-12345';
    component.apiClientReady.set(true);
    component.scannerId = 111;

    component.qrCodeReaderSuccessCallback(testText, undefined);

    expect(wsService.publish).toHaveBeenCalledWith({
      destination: '/topic/scanners/111/results',
      body: JSON.stringify({value: +testText})
    });
    expect(component.lastSentText).toBe(testText);
  });

  it('qrCodeReaderSuccessCallback skipped when apiClient not ready', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    const testText = 'test123';
    component.apiClientReady.set(false);

    component.qrCodeReaderSuccessCallback(testText, undefined);

    expect(wsService.publish).not.toHaveBeenCalledWith({
      destination: '/app/scanners/result',
      body: JSON.stringify({value: testText})
    });
  });

  it('processApiConnectionState with state OPEN', () => {
    const registration: ScannerRegistration = {scannerId: 123};
    const message: IMessage = {
      body: JSON.stringify(registration),
      ack: null,
      nack: null,
      headers: null,
      command: null,
      binaryBody: null,
      isBinaryBody: false
    };
    wsService.watch.and.returnValue(of(message));

    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    component.apiClientReady.set(false);

    component.processApiConnectionState(RxStompState.OPEN);

    expect(component.apiClientReady()).toBe(true);
  });

  it('processApiConnectionState with state CONNECTING', async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    component.apiClientReady.set(true);

    component.processApiConnectionState(RxStompState.CONNECTING);

    expect(component.apiClientReady()).toBe(false);
  });

  it('processApiConnectionState with state CLOSING', async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    component.apiClientReady.set(true);

    component.processApiConnectionState(RxStompState.CLOSING);

    expect(component.apiClientReady()).toBe(false);
  });

  it('processApiConnectionState with state CLOSED', async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    component.apiClientReady.set(true);

    component.processApiConnectionState(RxStompState.CLOSED);

    expect(component.apiClientReady()).toBe(false);
  });

  it('setSelectedCamera', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    qrCodeReaderService.restart.and.returnValue(Promise.resolve(null));
    const testCamera: CameraDevice = {id: 'cam1', label: 'Camera 1 Front'};

    component.selectedCamera = testCamera;

    expect(component.currentCamera).toEqual(testCamera);
    expect(qrCodeReaderService.saveCurrentCamera).toHaveBeenCalledWith(testCamera);
    expect(qrCodeReaderService.restart).toHaveBeenCalledWith(testCamera.id);
  });

});
