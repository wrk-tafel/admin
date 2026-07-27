import {Component, computed, DestroyRef, effect, inject, signal, WritableSignal} from '@angular/core';
import {QRCodeReaderService} from '../../services/qrcode-reader/qrcode-reader.service';
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

  readonly scannerId = signal<number | undefined>(undefined);
  lastScanResult = signal<number | undefined>(undefined);
  availableCameras = signal<MediaDeviceInfo[] | undefined>(undefined);
  currentCamera = signal<MediaDeviceInfo | undefined>(undefined);

  readonly readyState: WritableSignal<boolean> = signal(false);
  readonly readyStateColor = computed(() => this.readyState() ? 'success' : 'danger');
  readonly readyStateText = computed(() => this.readyState() ? 'Bereit' : 'Nicht bereit');

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

      this.qrCodeReaderService.init('qrCodeReaderVideo', this.qrCodeReaderSuccessCallback);
      const promise = this.qrCodeReaderService.start(currentCamera.deviceId);
      await this.processQrCodeReaderPromise(promise);
    }
  });

  currentCameraEffect = effect(() => {
    const currentCamera = this.currentCamera();
    if (currentCamera) {
      this.qrCodeReaderService.saveCurrentCamera(currentCamera);

      const promise = this.qrCodeReaderService.restart(currentCamera.deviceId);
      this.processQrCodeReaderPromise(promise);
    }
  });

  private registerScanner(): Promise<ScannerRegistration> {
    const storageKey = 'scanner-id';
    const storageValue = localStorage.getItem(storageKey);

    let existingScannerId;
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

  async processQrCodeReaderPromise(promise: Promise<void>) {
    await promise.then(
      () => {
        this.readyState.set(true);
      },
      () => {
        this.readyState.set(false);
      }
    );
  }

  trackByCameraId(camera: MediaDeviceInfo): string {
    return camera.deviceId;
  }

  // Scanner registration and camera startup happen concurrently, so a scan can be decoded
  // before scannerId() resolves. Route through this effect (instead of sending directly from
  // the callback) so it fires once scannerId becomes available too, instead of dropping the
  // scan or posting to `/scanners/undefined/results`.
  sendScanResultEffect = effect(() => {
    const scannerId = this.scannerId();
    const lastScanResult = this.lastScanResult();
    if (scannerId !== undefined && lastScanResult !== undefined) {
      this.scannerApiService.sendScanResult(scannerId, lastScanResult).subscribe();
    }
  });

  qrCodeReaderSuccessCallback = (decodedText: string) => {
    const scanResult: ScanResult = {value: +decodedText};
    console.log('SCANNED', scanResult);
    if (this.lastScanResult() !== scanResult.value) {
      this.lastScanResult.set(scanResult.value);
    }
  };

  get selectedCamera(): MediaDeviceInfo | undefined {
    return this.currentCamera();
  }

  set selectedCamera(camera: MediaDeviceInfo) {
    this.currentCamera.set(camera);
  }

}

export interface ScanResult {
  value: number;
}
