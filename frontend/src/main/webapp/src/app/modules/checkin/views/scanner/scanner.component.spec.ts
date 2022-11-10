import {TestBed, waitForAsync} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {ScannerComponent} from "./scanner.component";
import {ScannerApiService} from "../../api/scanner-api.service";
import {QRCodeReaderService} from "./camera/qrcode-reader.service";

describe('ScannerComponent', () => {
  let apiService: jasmine.SpyObj<ScannerApiService>;
  let qrCodeReaderService: jasmine.SpyObj<QRCodeReaderService>;

  beforeEach(waitForAsync(() => {
    const apiServiceSpy = jasmine.createSpyObj('ScannerApiService', ['close']);
    const qrCodeReaderServiceSpy = jasmine.createSpyObj('QRCodeReaderService', ['stop']);

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

});
