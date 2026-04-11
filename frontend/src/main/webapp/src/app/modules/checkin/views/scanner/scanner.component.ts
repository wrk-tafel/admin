import {Component, computed, DestroyRef, effect, inject, signal, WritableSignal} from '@angular/core';
import {QRCodeReaderService} from '../../services/qrcode-reader/qrcode-reader.service';
import {CameraDevice} from 'html5-qrcode/esm/camera/core';
import {Html5QrcodeResult} from 'html5-qrcode/core';
import {MatBadgeModule} from '@angular/material/badge';
import {MatCard, MatCardContent} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatSelect, MatSelectModule} from '@angular/material/select';
import {FormsModule} from '@angular/forms';

import {ScannerApiService, ScannerRegistration} from '../../../../api/scanner-api.service';
import {firstValueFrom} from 'rxjs';
import {tap} from 'rxjs/operators';
import {MatDivider} from '@angular/material/list';

@Component({
  selector: 'tafel-scanner',
  templateUrl: 'scanner.component.html',
  imports: [
    MatBadgeModule,
    MatCard,
    MatCardContent,
    MatButtonModule,
    MatIconModule,
    MatSelect,
    MatSelectModule,
    FormsModule,
    MatDivider
  ]
})
export class ScannerComponent {
  private readonly qrCodeReaderService = inject(QRCodeReaderService);
  private readonly scannerApiService = inject(ScannerApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly scannerId = signal<number>(undefined);
  lastScanResult = signal<number>(undefined);
  availableCameras = signal<CameraDevice[] | undefined>(undefined);
  currentCamera = signal<CameraDevice>(undefined);

  readonly readyState: WritableSignal<boolean> = signal(false);
  readonly readyStateColor = computed(() => {
    return this.readyState() ? 'success' : 'danger';
  });
  readonly readyStateText = computed(() => {
    return this.readyState() ? 'Bereit' : 'Nicht bereit';
  });

  initEffect = effect(async () => {
    const registrationPromise = this.registerScanner();

    const qrPromise = this.qrCodeReaderService.getCameras().then(async cameras => {
      this.availableCameras.set(cameras);
    });

    await Promise.all([registrationPromise, qrPromise]);

    this.destroyRef.onDestroy(async () => {
      await this.qrCodeReaderService.stop();
    });
  });

  availableCamerasEffect = effect(async () => {
    const availableCameras = this.availableCameras();
    if (availableCameras) {
      const currentCamera = this.qrCodeReaderService.getCurrentCamera(availableCameras);
      this.currentCamera.set(currentCamera);

      this.qrCodeReaderService.init('qrCodeReaderBox', this.qrCodeReaderSuccessCallback);
      const promise = this.qrCodeReaderService.start(currentCamera.id);
      await this.processQrCodeReaderPromise(promise);
    }
  });

  currentCameraEffect = effect(() => {
    const currentCamera = this.currentCamera();
    if (currentCamera) {
      this.qrCodeReaderService.saveCurrentCamera(currentCamera);

      const promise = this.qrCodeReaderService.restart(currentCamera.id);
      this.processQrCodeReaderPromise(promise);
    }
  });

  private registerScanner(): Promise<ScannerRegistration> {
    const storageKey = 'scanner-id';
    const storageValue = localStorage.getItem(storageKey);

    let existingScannerId = undefined;
    if (storageValue) {
      existingScannerId = Number(storageValue);
    }

    return firstValueFrom(this.scannerApiService.registerScanner(existingScannerId)
      .pipe(tap(response => {
        this.scannerId.set(response.scannerId);
        localStorage.setItem(storageKey, response.scannerId.toString());
      }))
    );
  }

  async processQrCodeReaderPromise(promise: Promise<null>) {
    await promise.then(
      () => {
        this.readyState.set(true);
      },
      () => {
        this.readyState.set(false);
      }
    );
  }

  trackByCameraId(camera: CameraDevice): string {
    return camera.id;
  }

  qrCodeReaderSuccessCallback = (decodedText: string, _: Html5QrcodeResult) => {
    const scanResult: ScanResult = {value: +decodedText};
    console.log("SCANNED", scanResult)
    const scannedValue = scanResult.value;
    if (!this.lastScanResult() || this.lastScanResult() !== scannedValue) {
      this.lastScanResult.set(scanResult.value);
      this.scannerApiService.sendScanResult(this.scannerId(), scanResult.value).subscribe();
    }
  }

  get selectedCamera(): CameraDevice {
    return this.currentCamera();
  }

  set selectedCamera(camera: CameraDevice) {
    this.currentCamera.set(camera);
  }

}

export interface ScanResult {
  value: number;
}
