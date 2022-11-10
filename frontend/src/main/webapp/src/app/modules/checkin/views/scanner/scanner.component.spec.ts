import {TestBed, waitForAsync} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {ScannerComponent} from "./scanner.component";
import {ScannerApiService} from "../../api/scanner-api.service";
import {QRCodeReaderService} from "./camera/qrcode-reader.service";
import {CameraDevice} from "html5-qrcode/core";
import {IFrame} from "@stomp/stompjs";

describe('ScannerComponent', () => {
  let apiService: jasmine.SpyObj<ScannerApiService>;
  let qrCodeReaderService: jasmine.SpyObj<QRCodeReaderService>;

  beforeEach(waitForAsync(() => {
    const apiServiceSpy = jasmine.createSpyObj('ScannerApiService', ['close', 'sendScanResult']);
    const qrCodeReaderServiceSpy = jasmine.createSpyObj('QRCodeReaderService', ['stop', 'saveLastUsedCameraId', 'restart']);

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

  // TODO INIT

  it('ngOnDestroy calls stops scanner api and qrCodeReader', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    component.ngOnDestroy();

    expect(apiService.close).toHaveBeenCalled();
    expect(qrCodeReaderService.stop).toHaveBeenCalled();
  });

  it('processReadyStates when both services are ready', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    const testStates = [true, true];

    component.processReadyStates(testStates);

    expect(component.stateMessage).toBe('Bereit');
    expect(component.stateClass).toBe('alert-info');
  });

  it('processReadyStates when qrCodeReader service is not ready', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    const testStates = [false, true];

    component.processReadyStates(testStates);

    expect(component.stateMessage).toBe('Kamera konnte nicht geladen werden!');
    expect(component.stateClass).toBe('alert-danger');
  });

  it('processReadyStates when apiService is not ready', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    const testStates = [true, false];

    component.processReadyStates(testStates);

    expect(component.stateMessage).toBe('Verbindung zum Server fehlgeschlagen!');
    expect(component.stateClass).toBe('alert-danger');
  });

  it('processReadyStates when both services are not ready', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    const testStates = [false, false];

    component.processReadyStates(testStates);

    expect(component.stateMessage).toBe('Kamera konnte nicht geladen werden!');
    expect(component.stateClass).toBe('alert-danger');
  });

  it('qrCodeReaderSuccessCallback received new text', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    component.lastSentText = null;
    const testText = 'test123';

    component.qrCodeReaderSuccessCallback(testText, undefined);

    expect(component.stateMessage).toBe('Scan erfolgreich: ' + testText);
    expect(component.stateClass).toBe('alert-success');
    expect(apiService.sendScanResult).toHaveBeenCalledWith({value: testText});
    expect(component.lastSentText).toBe(testText);
  });

  it('qrCodeReaderSuccessCallback and received the same text', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    const testText = 'test123';
    component.lastSentText = testText;

    component.qrCodeReaderSuccessCallback(testText, undefined);

    expect(component.stateMessage).toBe('Scan erfolgreich: ' + testText);
    expect(component.stateClass).toBe('alert-success');
    expect(apiService.sendScanResult).not.toHaveBeenCalledWith({value: testText});
    expect(component.lastSentText).toBe(testText);
  });

  it('qrCodeReaderSuccessCallback and received a different text', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;

    component.lastSentText = 'old-test123';
    const testText = 'test123';

    component.qrCodeReaderSuccessCallback(testText, undefined);

    expect(component.stateMessage).toBe('Scan erfolgreich: ' + testText);
    expect(component.stateClass).toBe('alert-success');
    expect(apiService.sendScanResult).toHaveBeenCalledWith({value: testText});
    expect(component.lastSentText).toBe(testText);
  });

  it('qrCodeReaderErrorCallback fills fields correctly', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    const testErrMsg = 'test-error';

    component.qrCodeReaderErrorCallback(testErrMsg, undefined);

    expect(component.stateMessage).toBe('Kein gültiger QR-Code gefunden!');
    expect(component.stateClass).toBe('alert-info');
  });

  it('apiClientSuccessCallback with a connected command', async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    const testFrame: IFrame = {command: 'CONNECTED', headers: null, isBinaryBody: false, body: null, binaryBody: null};

    component.apiClientSuccessCallback(testFrame);

    await component.readyStates.subscribe(result => {
      expect(result[0]).toBe(true);
    });
  });

  it('apiClientSuccessCallback without a connected command', async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    const testFrame: IFrame = {command: 'TEST', headers: null, isBinaryBody: false, body: null, binaryBody: null};
    component.apiClientReadyState.next(false);

    component.apiClientSuccessCallback(testFrame);

    await component.readyStates.subscribe(result => {
      expect(result[1]).toBe(true);
    });
  });

  it('apiClientErrorCallback fills state correctly', async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    const testFrame: IFrame = {command: 'ERROR', headers: null, isBinaryBody: false, body: null, binaryBody: null};
    component.apiClientReadyState.next(true);

    component.apiClientErrorCallback(testFrame);

    await component.readyStates.subscribe(result => {
      expect(result[1]).toBe(false);
    });
  });

  it('apiClientCloseCallback fills state correctly', async () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    const testFrame: IFrame = {command: 'CLOSED', headers: null, isBinaryBody: false, body: null, binaryBody: null};
    component.apiClientReadyState.next(true);

    component.apiClientCloseCallback(testFrame);

    await component.readyStates.subscribe(result => {
      expect(result[1]).toBe(false);
    });
  });

  it('setSelectedCamera', () => {
    const fixture = TestBed.createComponent(ScannerComponent);
    const component = fixture.componentInstance;
    qrCodeReaderService.restart.and.returnValue(Promise.resolve(null));
    const testCamera: CameraDevice = {id: 'cam1', label: 'Camera 1 Front'};

    component.selectedCamera = testCamera;

    expect(component.currentCamera).toEqual(testCamera);
    expect(qrCodeReaderService.saveLastUsedCameraId).toHaveBeenCalledWith(testCamera.id);
    expect(component.stateMessage).toBe('Wird geladen ...');
    expect(qrCodeReaderService.restart).toHaveBeenCalledWith(testCamera.id);
  });

});
