import {TestBed, waitForAsync} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {ScannerComponent} from './scanner.component';
import {CameraDevice} from 'html5-qrcode/esm/camera/core';
import {QRCodeReaderService} from '../../services/qrcode-reader/qrcode-reader.service';
import {ScannerApiService, ScannerRegistration} from '../../../../api/scanner-api.service';
import {EMPTY, of} from 'rxjs';

describe('ScannerComponent', () => {
  let scannerApiService: jasmine.SpyObj<ScannerApiService>;
  let qrCodeReaderService: jasmine.SpyObj<QRCodeReaderService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule],
      providers: [
        {
          provide: ScannerApiService,
          useValue: jasmine.createSpyObj('ScannerApiService', ['registerScanner', 'sendScanResult'])
        },
        {
          provide: QRCodeReaderService,
          useValue: jasmine.createSpyObj('QRCodeReaderService', ['stop', 'saveCurrentCamera', 'restart', 'getCameras', 'getCurrentCamera', 'init', 'start'])
        }
      ]
    }).compileComponents();

    scannerApiService = TestBed.inject(ScannerApiService) as jasmine.SpyObj<ScannerApiService>;
    qrCodeReaderService = TestBed.inject(QRCodeReaderService) as jasmine.SpyObj<QRCodeReaderService>;
  }));

  it('component can be created', waitForAsync(async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  }));

  it('ngOnInit', waitForAsync(async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    const testCamera1: CameraDevice = {id: 'cam1', label: 'Camera 1 Front'};
    const testCamera2: CameraDevice = {id: 'cam2', label: 'A camera 2 Back'};
    const testCameraList: CameraDevice[] = [testCamera1, testCamera2];
    qrCodeReaderService.getCameras.and.returnValue(Promise.resolve(testCameraList));
    qrCodeReaderService.getCurrentCamera.and.returnValue(testCamera2);
    qrCodeReaderService.start.and.returnValue(Promise.resolve(null));

    const scannerRegistration: ScannerRegistration = {scannerId: 123};
    scannerApiService.registerScanner.and.returnValue(of(scannerRegistration));

    await component.ngOnInit();

    expect(component.scannerId).toBe(scannerRegistration.scannerId);

    expect(component.availableCameras).toEqual(testCameraList);
    expect(component.currentCamera).toEqual(testCamera2);
    expect(qrCodeReaderService.getCameras).toHaveBeenCalled();
    expect(qrCodeReaderService.getCurrentCamera).toHaveBeenCalled();
    expect(qrCodeReaderService.start).toHaveBeenCalled();
    expect(scannerApiService.registerScanner).toHaveBeenCalled();
  }));

  it('ngOnDestroy stops qrCodeReader', waitForAsync(async () => {
    qrCodeReaderService.stop.and.returnValue(Promise.resolve(null));

    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    await component.ngOnDestroy();

    expect(qrCodeReaderService.stop).toHaveBeenCalled();
  }));

  it('processQrCodeReaderPromise fills state when successful', waitForAsync(async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    component.ready.set(false);

    await component.processQrCodeReaderPromise(Promise.resolve(null));

    expect(component.ready()).toBe(true);
  }));

  it('processQrCodeReaderPromise fills state when failed', waitForAsync(async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    component.ready.set(true);

    await component.processQrCodeReaderPromise(Promise.reject());

    expect(component.ready()).toBe(false);
  }));

  it('qrCodeReaderSuccessCallback and received the same text', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    const testResult = 12345;
    component.lastScanResult = testResult;

    component.qrCodeReaderSuccessCallback(String(testResult), undefined);

    expect(scannerApiService.sendScanResult).not.toHaveBeenCalled();
    expect(component.lastScanResult).toBe(testResult);
  });

  it('qrCodeReaderSuccessCallback received new text', (() => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    scannerApiService.sendScanResult.and.returnValue(EMPTY);

    const scannerId = 111;
    const testValue = 12345;
    component.lastScanResult = null;
    component.scannerId = scannerId;

    component.qrCodeReaderSuccessCallback(String(testValue), undefined);

    expect(scannerApiService.sendScanResult).toHaveBeenCalledWith(scannerId, testValue);
    expect(component.lastScanResult).toBe(testValue);
  }));

  it('qrCodeReaderSuccessCallback and received a different text', waitForAsync(async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    const scannerId = 111;
    const testResult = 12345;
    scannerApiService.sendScanResult.and.returnValue(EMPTY);

    component.lastScanResult = 67890;
    component.scannerId = scannerId;

    component.qrCodeReaderSuccessCallback(String(testResult), undefined);

    expect(scannerApiService.sendScanResult).toHaveBeenCalledWith(scannerId, testResult);
    expect(component.lastScanResult).toBe(testResult);
  }));

  it('setSelectedCamera', waitForAsync(async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    qrCodeReaderService.restart.and.returnValue(Promise.resolve(null));
    const testCamera: CameraDevice = {id: 'cam1', label: 'Camera 1 Front'};
    scannerApiService.sendScanResult.and.returnValue(EMPTY);

    component.selectedCamera = testCamera;

    expect(component.currentCamera).toEqual(testCamera);
    expect(qrCodeReaderService.saveCurrentCamera).toHaveBeenCalledWith(testCamera);
    expect(qrCodeReaderService.restart).toHaveBeenCalledWith(testCamera.id);
  }));

});
