import {fakeAsync, TestBed, tick, waitForAsync} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {ScannerComponent} from './scanner.component';
import {ScannerApiService} from '../../api/scanner-api.service';
import {QRCodeReaderService} from './camera/qrcode-reader.service';
import {CameraDevice} from 'html5-qrcode/core';
import {IFrame} from '@stomp/stompjs';

describe('ScannerComponent', () => {
  let apiService: jasmine.SpyObj<ScannerApiService>;
  let qrCodeReaderService: jasmine.SpyObj<QRCodeReaderService>;

  beforeEach(waitForAsync(() => {
    const apiServiceSpy = jasmine.createSpyObj('ScannerApiService', ['close', 'sendScanResult', 'connect']);
    const qrCodeReaderServiceSpy = jasmine.createSpyObj('QRCodeReaderService', ['stop', 'saveCurrentCamera', 'restart', 'getCameras', 'getCurrentCamera', 'init', 'start']);

    TestBed.configureTestingModule({
      imports: [CommonModule],
      providers: [
        {
          provide: ScannerApiService,
          useValue: apiServiceSpy
        },
        {
          provide: QRCodeReaderService,
          useValue: qrCodeReaderServiceSpy
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(ScannerApiService) as jasmine.SpyObj<ScannerApiService>;
    qrCodeReaderService = TestBed.inject(QRCodeReaderService) as jasmine.SpyObj<QRCodeReaderService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('ngOnInit', fakeAsync(() => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    const testCamera1: CameraDevice = {id: 'cam1', label: 'Camera 1 Front'};
    const testCamera2: CameraDevice = {id: 'cam2', label: 'A camera 2 Back'};
    const testCameraList: CameraDevice[] = [testCamera1, testCamera2];
    qrCodeReaderService.getCameras.and.returnValue(Promise.resolve(testCameraList));
    qrCodeReaderService.getCurrentCamera.and.returnValue(testCamera2);
    qrCodeReaderService.start.and.returnValue(Promise.resolve(null));

    component.ngOnInit();
    tick(1000);

    expect(component.availableCameras).toEqual(testCameraList);
    expect(component.currentCamera).toEqual(testCamera2);
    expect(qrCodeReaderService.getCameras).toHaveBeenCalled();
    expect(qrCodeReaderService.getCurrentCamera).toHaveBeenCalled();
    expect(qrCodeReaderService.start).toHaveBeenCalled();
    expect(apiService.connect).toHaveBeenCalled();
  }));

  it('ngOnDestroy calls stops scanner api and qrCodeReader', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    component.ngOnDestroy();

    expect(apiService.close).toHaveBeenCalled();
    expect(qrCodeReaderService.stop).toHaveBeenCalled();
  });

  it('processQrCodeReaderPromise fills state when successful', async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    component.qrCodeReaderReady = false;

    await component.processQrCodeReaderPromise(Promise.resolve(null));

    expect(component.qrCodeReaderReady).toBe(true);
  });

  it('processQrCodeReaderPromise fills state when failed', async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    component.qrCodeReaderReady = true;

    await component.processQrCodeReaderPromise(Promise.reject());

    expect(component.qrCodeReaderReady).toBe(false);
  });

  it('qrCodeReaderSuccessCallback received new text', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    component.lastSentText = null;
    const testText = 'test123';

    component.qrCodeReaderSuccessCallback(testText, undefined);

    expect(apiService.sendScanResult).toHaveBeenCalledWith({value: testText});
    expect(component.lastSentText).toBe(testText);
  });

  it('qrCodeReaderSuccessCallback and received the same text', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    const testText = 'test123';
    component.lastSentText = testText;

    component.qrCodeReaderSuccessCallback(testText, undefined);

    expect(apiService.sendScanResult).not.toHaveBeenCalledWith({value: testText});
    expect(component.lastSentText).toBe(testText);
  });

  it('qrCodeReaderSuccessCallback and received a different text', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    component.lastSentText = 'old-test123';
    const testText = 'test123';

    component.qrCodeReaderSuccessCallback(testText, undefined);

    expect(apiService.sendScanResult).toHaveBeenCalledWith({value: testText});
    expect(component.lastSentText).toBe(testText);
  });

  it('apiClientSuccessCallback with a connected command', async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    const testFrame: IFrame = {command: 'CONNECTED', headers: null, isBinaryBody: false, body: null, binaryBody: null};

    component.apiClientSuccessCallback(testFrame);

    expect(component.apiClientReady).toBe(true);
  });

  it('apiClientSuccessCallback without a connected command', async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    const testFrame: IFrame = {command: 'TEST', headers: null, isBinaryBody: false, body: null, binaryBody: null};
    component.apiClientReady = false;

    component.apiClientSuccessCallback(testFrame);

    expect(component.apiClientReady).toBe(true);
  });

  it('apiClientErrorCallback fills state correctly', async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    const testFrame: IFrame = {command: 'ERROR', headers: null, isBinaryBody: false, body: null, binaryBody: null};
    component.apiClientReady = true;

    component.apiClientErrorCallback(testFrame);

    expect(component.apiClientReady).toBe(false);
  });

  it('apiClientCloseCallback fills state correctly', async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    const testFrame: IFrame = {command: 'CLOSED', headers: null, isBinaryBody: false, body: null, binaryBody: null};
    component.apiClientReady = true;

    component.apiClientCloseCallback(testFrame);

    expect(component.apiClientReady).toBe(false);
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
