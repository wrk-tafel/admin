import {Component, computed, DestroyRef, effect, inject, signal, WritableSignal} from '@angular/core';
import {QRCodeReaderService} from '../../services/qrcode-reader/qrcode-reader.service';
import {CameraDevice} from 'html5-qrcode/esm/camera/core';
import {Html5QrcodeResult} from 'html5-qrcode/core';
import {
  BadgeComponent,
  CardBodyComponent,
  CardComponent,
  ColComponent,
  FormSelectDirective,
  RowComponent
} from '@coreui/angular';
import {FormsModule} from '@angular/forms';

import {ScannerApiService, ScannerRegistration} from '../../../../api/scanner-api.service';
import {firstValueFrom} from 'rxjs';
import {tap} from 'rxjs/operators';

@Component({
    selector: 'tafel-scanner',
    templateUrl: 'scanner.component.html',
    imports: [
    RowComponent,
    ColComponent,
    CardComponent,
    CardBodyComponent,
    BadgeComponent,
    FormsModule,
    FormSelectDirective
]
})
export class ScannerComponent {
  private readonly qrCodeReaderService = inject(QRCodeReaderService);
  private readonly scannerApiService = inject(ScannerApiService);
  private readonly destroyRef = inject(DestroyRef);

  scannerId: number;
  lastScanResult: number;
  availableCameras: CameraDevice[] = [];
  currentCamera: CameraDevice;

  readonly ready: WritableSignal<boolean> = signal(false);
  readonly readyColor = computed(() => {
    return this.ready() ? 'success' : 'danger';
  });
  readonly readyText = computed(() => {
    return this.ready() ? 'Bereit' : 'Nicht bereit';
  });

  get selectedCamera(): CameraDevice {
    return this.currentCamera;
  }

  set selectedCamera(camera: CameraDevice) {
    this.currentCamera = camera;
    this.qrCodeReaderService.saveCurrentCamera(camera);

    const promise = this.qrCodeReaderService.restart(camera.id);
    this.processQrCodeReaderPromise(promise);
  }

  constructor() {
    // Initialize scanner on component creation
    effect(() => {
      (async () => {
        const registrationPromise = this.registerScanner();

        const qrPromise = this.qrCodeReaderService.getCameras().then(async cameras => {
          this.availableCameras = cameras;
          this.currentCamera = this.qrCodeReaderService.getCurrentCamera(cameras);

          this.qrCodeReaderService.init('qrCodeReaderBox', this.qrCodeReaderSuccessCallback);
          const promise = this.qrCodeReaderService.start(this.currentCamera.id);
          await this.processQrCodeReaderPromise(promise);
        });

        await Promise.all([registrationPromise, qrPromise]);
      })();
    });

    // Register cleanup on destroy
    this.destroyRef.onDestroy(async () => {
      await this.qrCodeReaderService.stop();
    });
  }

  private registerScanner(): Promise<ScannerRegistration> {
    const storageKey = 'scanner-id';
    const storageValue = localStorage.getItem(storageKey);

    let existingScannerId = undefined;
    if (storageValue) {
      existingScannerId = Number(storageValue);
    }

    return firstValueFrom(this.scannerApiService.registerScanner(existingScannerId)
      .pipe(tap(response => {
        this.scannerId = response.scannerId;
        localStorage.setItem(storageKey, response.scannerId.toString());
      }))
    );
  }

  async processQrCodeReaderPromise(promise: Promise<null>) {
    await promise.then(
      () => {
        this.ready.set(true);
      },
      () => {
        this.ready.set(false);
      }
    );
  }

  trackByCameraId(index: number, camera: CameraDevice): string {
    return camera.id;
  }

  qrCodeReaderSuccessCallback = (decodedText: string, _: Html5QrcodeResult) => {
    const scanResult: ScanResult = {value: +decodedText};
    const scannedValue = scanResult.value;
    if (!this.lastScanResult || this.lastScanResult !== scannedValue) {
      this.lastScanResult = scanResult.value;
      this.scannerApiService.sendScanResult(this.scannerId, scanResult.value).subscribe();
    }
  }

}

export interface ScanResult {
  value: number;
}
