import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { ScannerComponent } from './scanner.component';
import { CameraDevice } from 'html5-qrcode/esm/camera/core';
import { QRCodeReaderService } from '../../services/qrcode-reader/qrcode-reader.service';
import { ScannerApiService, ScannerRegistration } from '../../../../api/scanner-api.service';
import { EMPTY, of } from 'rxjs';

describe('ScannerComponent', () => {
    let scannerApiService: MockedObject<ScannerApiService>;
    let qrCodeReaderService: MockedObject<QRCodeReaderService>;
    let fixture: ComponentFixture<ScannerComponent>;
    let component: ScannerComponent;

    beforeEach((() => {
        TestBed.configureTestingModule({
            imports: [CommonModule, RouterTestingModule],
            providers: [
                {
                    provide: ScannerApiService,
                    useValue: {
                        registerScanner: vi.fn().mockReturnValue(of({ scannerId: 123 })),
                        sendScanResult: vi.fn().mockReturnValue(EMPTY)
                    }
                },
                {
                    provide: QRCodeReaderService,
                    useValue: {
                        stop: vi.fn().mockResolvedValue(null),
                        saveCurrentCamera: vi.fn(),
                        restart: vi.fn().mockResolvedValue(null),
                        getCameras: vi.fn().mockResolvedValue([]),
                        getCurrentCamera: vi.fn().mockReturnValue({ id: 'default', label: 'Default Camera' }),
                        init: vi.fn(),
                        start: vi.fn().mockResolvedValue(null)
                    }
                }
            ]
        }).compileComponents();

        scannerApiService = TestBed.inject(ScannerApiService) as MockedObject<ScannerApiService>;
        qrCodeReaderService = TestBed.inject(QRCodeReaderService) as MockedObject<QRCodeReaderService>;

        fixture = TestBed.createComponent(ScannerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        // Wait for effects to complete
        return fixture.whenStable();
    }));

    it('component can be created', () => {
        expect(component).toBeTruthy();
    });

    it('readyState signals work correctly', () => {
        expect(component.readyState()).toBe(false);
        component.readyState.set(true);
        expect(component.readyState()).toBe(true);
        expect(component.readyStateColor()).toBe('success');
        expect(component.readyStateText()).toBe('Bereit');
    });

    it('processQrCodeReaderPromise handles success', async () => {
        component.readyState.set(false);

        await component.processQrCodeReaderPromise(Promise.resolve(null));

        expect(component.readyState()).toBe(true);
    });

    it('processQrCodeReaderPromise handles failure', async () => {
        component.readyState.set(true);

        await component.processQrCodeReaderPromise(Promise.reject());

        expect(component.readyState()).toBe(false);
    });

    it('qrCodeReaderSuccessCallback rejects duplicate scans', () => {
        component.lastScanResult.set(12345);
        component.scannerId.set(111);

        component.qrCodeReaderSuccessCallback('12345', undefined);

        expect(scannerApiService.sendScanResult).not.toHaveBeenCalled();
        expect(component.lastScanResult()).toBe(12345);
    });

    it('qrCodeReaderSuccessCallback processes new scan', () => {
        component.lastScanResult.set(undefined);
        component.scannerId.set(111);

        component.qrCodeReaderSuccessCallback('12345', undefined);

        expect(scannerApiService.sendScanResult).toHaveBeenCalledWith(111, 12345);
        expect(component.lastScanResult()).toBe(12345);
    });

    it('qrCodeReaderSuccessCallback processes different scan', () => {
        component.lastScanResult.set(67890);
        component.scannerId.set(111);

        component.qrCodeReaderSuccessCallback('12345', undefined);

        expect(scannerApiService.sendScanResult).toHaveBeenCalledWith(111, 12345);
        expect(component.lastScanResult()).toBe(12345);
    });

    it('destroy cleanup stops QR code reader', async () => {
        fixture.destroy();
        await fixture.whenStable();

        expect(qrCodeReaderService.stop).toHaveBeenCalled();
    });

    it('setSelectedCamera setter changes currentCamera', () => {
        const testCamera: CameraDevice = { id: 'cam1', label: 'Camera 1 Front' };

        component.currentCamera.set(testCamera);

        expect(component.currentCamera()).toEqual(testCamera);
    });

    it('trackByCameraId returns camera ID', () => {
        const testCamera: CameraDevice = { id: 'cam1', label: 'Camera 1' };
        const result = component.trackByCameraId(testCamera);

        expect(result).toBe('cam1');
    });

});