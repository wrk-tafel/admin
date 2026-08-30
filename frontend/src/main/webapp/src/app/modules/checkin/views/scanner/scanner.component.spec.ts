import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { ScannerComponent } from './scanner.component';
import { QRCodeReaderService } from '../../services/qrcode-reader/qrcode-reader.service';
import { ScannerApiService } from '../../../../api/scanner-api.service';
import { EMPTY, of, Subject, throwError } from 'rxjs';

describe('ScannerComponent', () => {
    let scannerApiService: MockedObject<ScannerApiService>;
    let qrCodeReaderService: MockedObject<QRCodeReaderService>;
    let fixture: ComponentFixture<ScannerComponent>;
    let component: ScannerComponent;

    function setupTestBed(registerScannerReturn = of({ scannerId: 123 })) {
        TestBed.configureTestingModule({
            imports: [CommonModule, RouterTestingModule],
            providers: [
                {
                    provide: ScannerApiService,
                    useValue: {
                        registerScanner: vi.fn().mockReturnValue(registerScannerReturn),
                        sendScanResult: vi.fn().mockReturnValue(EMPTY)
                    }
                },
                {
                    provide: QRCodeReaderService,
                    useValue: {
                        stop: vi.fn().mockResolvedValue(undefined),
                        saveCurrentCamera: vi.fn(),
                        restart: vi.fn().mockResolvedValue(undefined),
                        getCameras: vi.fn().mockResolvedValue([]),
                        getCurrentCamera: vi.fn().mockReturnValue({ deviceId: 'default', label: 'Default Camera' } as MediaDeviceInfo),
                        init: vi.fn(),
                        start: vi.fn().mockResolvedValue(undefined),
                        isTorchSupported: vi.fn().mockReturnValue(false),
                        setTorch: vi.fn().mockResolvedValue(undefined)
                    }
                }
            ]
        }).compileComponents();

        scannerApiService = TestBed.inject(ScannerApiService) as MockedObject<ScannerApiService>;
        qrCodeReaderService = TestBed.inject(QRCodeReaderService) as MockedObject<QRCodeReaderService>;

        fixture = TestBed.createComponent(ScannerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        return fixture.whenStable();
    }

    beforeEach(() => setupTestBed());

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

        await component.processQrCodeReaderPromise(Promise.resolve());

        expect(component.readyState()).toBe(true);
    });

    it('processQrCodeReaderPromise handles failure', async () => {
        component.readyState.set(true);

        await component.processQrCodeReaderPromise(Promise.reject());

        expect(component.readyState()).toBe(false);
    });

    it('qrCodeReaderSuccessCallback rejects duplicate scans', async () => {
        component.lastScanResult.set(12345);
        component.scannerId.set(111);
        await fixture.whenStable();
        scannerApiService.sendScanResult.mockClear();

        component.qrCodeReaderSuccessCallback('12345');
        await fixture.whenStable();

        expect(scannerApiService.sendScanResult).not.toHaveBeenCalled();
        expect(component.lastScanResult()).toBe(12345);
    });

    it('qrCodeReaderSuccessCallback processes new scan', async () => {
        component.lastScanResult.set(undefined);
        component.scannerId.set(111);

        component.qrCodeReaderSuccessCallback('12345');
        await fixture.whenStable();

        expect(scannerApiService.sendScanResult).toHaveBeenCalledWith(111, 12345);
        expect(component.lastScanResult()).toBe(12345);
    });

    it('qrCodeReaderSuccessCallback processes different scan', async () => {
        component.lastScanResult.set(67890);
        component.scannerId.set(111);
        await fixture.whenStable();
        scannerApiService.sendScanResult.mockClear();

        component.qrCodeReaderSuccessCallback('12345');
        await fixture.whenStable();

        expect(scannerApiService.sendScanResult).toHaveBeenCalledWith(111, 12345);
        expect(component.lastScanResult()).toBe(12345);
    });

    it('scan decoded before scannerId resolves is still sent once scannerId becomes available', async () => {
        // Regression test: camera startup and scanner registration run concurrently, so a QR
        // code can be decoded before scannerId() resolves. The send must not be dropped, and
        // must not fire with an undefined scannerId (which 500s the backend).
        component.scannerId.set(undefined);
        component.lastScanResult.set(undefined);
        await fixture.whenStable();

        component.qrCodeReaderSuccessCallback('12345');
        await fixture.whenStable();

        expect(scannerApiService.sendScanResult).not.toHaveBeenCalled();
        expect(component.lastScanResult()).toBe(12345);

        component.scannerId.set(111);
        await fixture.whenStable();

        expect(scannerApiService.sendScanResult).toHaveBeenCalledWith(111, 12345);
    });

    it('destroy cleanup stops QR code reader', async () => {
        fixture.destroy();
        await fixture.whenStable();

        expect(qrCodeReaderService.stop).toHaveBeenCalled();
    });

    it('still stops the QR code reader when destroyed before registration/camera enumeration resolve', () => {
        // Regression test: a slow/unreachable backend must not leave the camera running -
        // the cleanup has to be registered before this async work, not after it resolves.
        scannerApiService.registerScanner.mockReturnValue(new Subject());
        qrCodeReaderService.getCameras.mockReturnValue(new Promise(() => { /* never resolves */ }));

        const slowFixture = TestBed.createComponent(ScannerComponent);
        slowFixture.detectChanges();

        expect(() => slowFixture.destroy()).not.toThrow();
        expect(qrCodeReaderService.stop).toHaveBeenCalled();
    });

    it('setSelectedCamera setter changes currentCamera', () => {
        const testCamera = { deviceId: 'cam1', label: 'Camera 1 Front' } as MediaDeviceInfo;

        component.currentCamera.set(testCamera);

        expect(component.currentCamera()).toEqual(testCamera);
    });

    it('trackByCameraId returns camera ID', () => {
        const testCamera = { deviceId: 'cam1', label: 'Camera 1' } as MediaDeviceInfo;
        const result = component.trackByCameraId(testCamera);

        expect(result).toBe('cam1');
    });

    describe('phase / connection state', () => {
        it('starts in the pairing phase', () => {
            expect(component.phase()).toBe('pairing');
            expect(component.connectionLost()).toBe(false);
        });

        it('switches to the scanning phase once the camera first starts successfully', async () => {
            await component.processQrCodeReaderPromise(Promise.resolve());

            expect(component.phase()).toBe('scanning');
        });

        it('a later camera failure surfaces as connectionLost instead of reverting to pairing', async () => {
            await component.processQrCodeReaderPromise(Promise.resolve());
            expect(component.phase()).toBe('scanning');

            await component.processQrCodeReaderPromise(Promise.reject());

            expect(component.phase()).toBe('scanning');
            expect(component.connectionLost()).toBe(true);
        });

        it('rebinds the QR reader once more when switching to the scanning phase (a different <video> element than pairing)', async () => {
            // The shared component's own natural startup (registration + camera enumeration) is
            // still resolving asynchronously at this point - settle it first so its restart()
            // calls can't race with (and leak into) this test's own fresh instance below.
            await vi.waitFor(() => expect(component.phase()).toBe('scanning'));
            qrCodeReaderService.restart.mockClear();

            const testCamera = { deviceId: 'cam1', label: 'Camera 1' } as MediaDeviceInfo;
            qrCodeReaderService.getCurrentCamera.mockReturnValue(testCamera);

            const freshFixture = TestBed.createComponent(ScannerComponent);
            freshFixture.detectChanges();

            // One restart() call for the pairing-phase <video>, a second rebinding to the
            // scanning-phase one once that phase is reached.
            await vi.waitFor(() => {
                const calls = qrCodeReaderService.restart.mock.calls.filter(call => call[0] === 'cam1');
                expect(calls.length).toBeGreaterThanOrEqual(2);
            });
        });

        it('a failed registration surfaces as connectionLost once scanning has started', async () => {
            await component.processQrCodeReaderPromise(Promise.resolve());
            expect(component.connectionLost()).toBe(false);

            scannerApiService.registerScanner.mockReturnValue(throwError(() => new Error('network down')));
            component.retryRegistration();
            await fixture.whenStable();

            expect(component.connectionLost()).toBe(true);
        });

        it('retryRegistration re-registers and clears connectionLost on success', async () => {
            await component.processQrCodeReaderPromise(Promise.resolve());
            scannerApiService.registerScanner.mockReturnValue(throwError(() => new Error('down')));
            component.retryRegistration();
            await fixture.whenStable();
            expect(component.connectionLost()).toBe(true);

            scannerApiService.registerScanner.mockReturnValue(of({ scannerId: 999 }));
            component.retryRegistration();
            await fixture.whenStable();

            expect(component.connectionLost()).toBe(false);
            expect(component.scannerId()).toBe(999);
        });
    });

    describe('scan feedback', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('shows non-duplicate feedback for a new scan and clears it after the timeout', () => {
            component.lastScanResult.set(undefined);

            component.qrCodeReaderSuccessCallback('12345');

            expect(component.scanFeedback()).toEqual({ value: 12345, isDuplicate: false });

            vi.advanceTimersByTime(2000);

            expect(component.scanFeedback()).toBeUndefined();
        });

        it('shows duplicate feedback for the same code scanned again', () => {
            component.lastScanResult.set(12345);

            component.qrCodeReaderSuccessCallback('12345');

            expect(component.scanFeedback()).toEqual({ value: 12345, isDuplicate: true });
        });

        it('a new scan while feedback is still showing resets the auto-hide timer', () => {
            component.lastScanResult.set(undefined);

            component.qrCodeReaderSuccessCallback('111');
            vi.advanceTimersByTime(1500);
            component.qrCodeReaderSuccessCallback('222');
            vi.advanceTimersByTime(1500);

            // Still showing - the second scan's own 2s window hasn't elapsed yet
            expect(component.scanFeedback()).toEqual({ value: 222, isDuplicate: false });

            vi.advanceTimersByTime(500);

            expect(component.scanFeedback()).toBeUndefined();
        });

        it('does not retrigger feedback for the same still-in-frame code within the cooldown', () => {
            // The QR reader decodes a code sitting in front of the camera roughly every 250ms
            // (QRCodeReaderService's delayBetweenScanAttempts) - without this, the flash/vibration
            // would fire dozens of times while the runner is still holding the card up.
            component.lastScanResult.set(undefined);

            component.qrCodeReaderSuccessCallback('12345');
            vi.advanceTimersByTime(2000); // auto-hide fires
            expect(component.scanFeedback()).toBeUndefined();

            component.qrCodeReaderSuccessCallback('12345'); // still within the 3s cooldown

            expect(component.scanFeedback()).toBeUndefined();
        });

        it('re-presenting the same code after the cooldown shows duplicate feedback again', () => {
            component.lastScanResult.set(undefined);

            component.qrCodeReaderSuccessCallback('12345');
            vi.advanceTimersByTime(3000); // past both the auto-hide and the rescan cooldown

            component.qrCodeReaderSuccessCallback('12345');

            expect(component.scanFeedback()).toEqual({ value: 12345, isDuplicate: true });
        });
    });

    describe('torch', () => {
        it('toggleTorch is a no-op when the camera does not support a torch', async () => {
            qrCodeReaderService.isTorchSupported.mockReturnValue(false);
            await component.processQrCodeReaderPromise(Promise.resolve());

            await component.toggleTorch();

            expect(qrCodeReaderService.setTorch).not.toHaveBeenCalled();
            expect(component.torchOn()).toBe(false);
        });

        it('toggleTorch switches the torch on and off when supported', async () => {
            qrCodeReaderService.isTorchSupported.mockReturnValue(true);
            await component.processQrCodeReaderPromise(Promise.resolve());
            expect(component.torchSupported()).toBe(true);

            await component.toggleTorch();
            expect(qrCodeReaderService.setTorch).toHaveBeenCalledWith(true);
            expect(component.torchOn()).toBe(true);

            await component.toggleTorch();
            expect(qrCodeReaderService.setTorch).toHaveBeenCalledWith(false);
            expect(component.torchOn()).toBe(false);
        });

        it('switching camera resets the torch state', async () => {
            qrCodeReaderService.isTorchSupported.mockReturnValue(true);
            await component.processQrCodeReaderPromise(Promise.resolve());
            await component.toggleTorch();
            expect(component.torchOn()).toBe(true);

            component.currentCamera.set({ deviceId: 'other', label: 'Other Camera' } as MediaDeviceInfo);
            await fixture.whenStable();

            expect(component.torchOn()).toBe(false);
        });
    });

});
