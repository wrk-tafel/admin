import {TestBed, waitForAsync} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {ScannerComponent} from "./scanner.component";
import {ScannerApiService} from "../../api/scanner-api.service";
import {QRCodeReaderService} from "./camera/qrcode-reader.service";

describe('ScannerComponent', () => {
  let apiService: jasmine.SpyObj<ScannerApiService>;
  let qrCodeReaderService: jasmine.SpyObj<QRCodeReaderService>;

  beforeEach(waitForAsync(() => {
    const apiServiceSpy = jasmine.createSpyObj('ScannerApiService', ['TODO']);
    const qrCodeReaderServiceSpy = jasmine.createSpyObj('QRCodeReaderService', ['TODO']);

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

});
