import {Component, computed, DestroyRef, effect, inject, signal, WritableSignal} from '@angular/core';
import {QRCodeReaderService} from '../../services/qrcode-reader/qrcode-reader.service';
import {MatButtonModule} from '@angular/material/button';
import {MatSelect, MatSelectModule} from '@angular/material/select';
import {FormsModule} from '@angular/forms';
import {MatIcon} from '@angular/material/icon';

import {ScannerApiService, ScannerRegistration} from '../../../../api/scanner-api.service';
import {firstValueFrom} from 'rxjs';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import boltIcon from '@material-symbols/svg-400/outlined/bolt-fill.svg';
import checkCircleIcon from '@material-symbols/svg-400/outlined/check_circle-fill.svg';
import linkOffIcon from '@material-symbols/svg-400/outlined/link_off-fill.svg';
import refreshIcon from '@material-symbols/svg-400/outlined/refresh-fill.svg';

// How long a scan's full-screen confirmation stays up before the video preview takes back over.
const SCAN_FEEDBACK_DURATION_MS = 2000;

// A code sitting still under the camera keeps getting decoded roughly every 250ms
// (QRCodeReaderService's delayBetweenScanAttempts) - without a cooldown, the very code the
// runner is still holding in frame would retrigger the full-screen flash/vibration/beep several
// times a second for as long as it stays there, which is both unusable (the video never comes
// back) and a flashing-content accessibility hazard (WCAG 2.3.1). Re-presenting the same code
// after this cooldown elapses is treated as a fresh scan again.
const RESCAN_COOLDOWN_MS = 3000;

@Component({
  selector: 'tafel-scanner',
  templateUrl: 'scanner.component.html',
  host: {class: 'flex min-h-0 flex-1 flex-col'},
  imports: [
    MatButtonModule,
    MatSelect,
    MatSelectModule,
    FormsModule,
    MatIcon
  ]
})
export class ScannerComponent {
  private readonly registerIcons = registerSvgIcons({
    bolt: boltIcon,
    check_circle: checkCircleIcon,
    link_off: linkOffIcon,
    refresh: refreshIcon
  });

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

  // Set once the camera has decoded successfully for the first time and never cleared again -
  // this is what drives the pairing -> scanning layout switch (see `phase`). A later camera
  // hiccup must surface as the `connectionLost` overlay on top of the scanning layout, not bounce
  // the runner back to the pairing screen they already read the number off of.
  private readonly hasStartedScanning = signal(false);
  readonly phase = computed<'pairing' | 'scanning'>(() => this.hasStartedScanning() ? 'scanning' : 'pairing');

  private readonly registrationFailed = signal(false);
  readonly connectionLost = computed(() => this.hasStartedScanning() && (!this.readyState() || this.registrationFailed()));

  readonly torchSupported = signal(false);
  readonly torchOn = signal(false);

  readonly scanFeedback = signal<ScanFeedback | undefined>(undefined);
  private scanFeedbackTimeoutId?: ReturnType<typeof setTimeout>;

  private wakeLockSentinel?: WakeLockSentinel;
  // The Wake Lock API releases itself whenever the tab loses visibility (e.g. the phone's screen
  // is briefly covered/backgrounded), so it has to be re-requested on every return to the
  // foreground - a kiosk phone that locks mid-shift silently unpairs the flow otherwise.
  private readonly visibilityChangeListener = () => {
    if (document.visibilityState === 'visible') {
      void this.requestWakeLock();
    }
  };

  constructor() {
    void this.requestWakeLock();
    document.addEventListener('visibilitychange', this.visibilityChangeListener);

    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', this.visibilityChangeListener);
      if (this.scanFeedbackTimeoutId) {
        clearTimeout(this.scanFeedbackTimeoutId);
      }
      void this.releaseWakeLock();
    });
  }

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

  // Only sets currentCamera here - starting/restarting the actual scan is left entirely to
  // currentCameraEffect below. Starting it concurrently from both effects raced two overlapping
  // decodeFromVideoDevice() calls against each other, which could leave one of them orphaned
  // and scanning forever with no reference left to stop it.
  availableCamerasEffect = effect(() => {
    const availableCameras = this.availableCameras();
    if (availableCameras) {
      const currentCamera = this.qrCodeReaderService.getCurrentCamera(availableCameras);
      this.qrCodeReaderService.init('qrCodeReaderVideo', this.qrCodeReaderSuccessCallback);
      this.currentCamera.set(currentCamera);
    }
  });

  currentCameraEffect = effect(() => {
    const currentCamera = this.currentCamera();
    if (currentCamera) {
      this.qrCodeReaderService.saveCurrentCamera(currentCamera);
      this.torchOn.set(false);

      const promise = this.qrCodeReaderService.restart(currentCamera.deviceId);
      this.processQrCodeReaderPromise(promise);
    }
  });

  private async registerScanner(): Promise<ScannerRegistration | undefined> {
    const storageKey = 'tafel.scanner.id';
    const storageValue = localStorage.getItem(storageKey);

    let existingScannerId;
    if (storageValue) {
      existingScannerId = Number(storageValue);
    }

    try {
      const response = await firstValueFrom(this.scannerApiService.registerScanner(existingScannerId));
      this.scannerId.set(response.scannerId);
      localStorage.setItem(storageKey, response.scannerId.toString());
      this.registrationFailed.set(false);
      return response;
    } catch {
      this.registrationFailed.set(true);
      return undefined;
    }
  }

  retryRegistration() {
    void this.registerScanner();
  }

  async processQrCodeReaderPromise(promise: Promise<void>) {
    await promise.then(
      () => {
        this.readyState.set(true);
        this.hasStartedScanning.set(true);
        this.torchSupported.set(this.qrCodeReaderService.isTorchSupported());
      },
      () => {
        this.readyState.set(false);
        this.torchSupported.set(false);
      }
    );
  }

  async toggleTorch() {
    if (!this.torchSupported()) {
      return;
    }
    const next = !this.torchOn();
    await this.qrCodeReaderService.setTorch(next);
    this.torchOn.set(next);
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

  private lastFeedbackValue: number | undefined;
  private lastFeedbackAt = 0;

  qrCodeReaderSuccessCallback = (decodedText: string) => {
    const value = +decodedText;

    const now = Date.now();
    if (this.lastFeedbackValue === value && (now - this.lastFeedbackAt) < RESCAN_COOLDOWN_MS) {
      return;
    }
    this.lastFeedbackValue = value;
    this.lastFeedbackAt = now;

    const isDuplicate = this.lastScanResult() === value;
    this.triggerScanFeedback(value, isDuplicate);

    if (!isDuplicate) {
      this.lastScanResult.set(value);
    }
  };

  private triggerScanFeedback(value: number, isDuplicate: boolean) {
    if (this.scanFeedbackTimeoutId) {
      clearTimeout(this.scanFeedbackTimeoutId);
    }

    this.scanFeedback.set({value, isDuplicate});
    this.playFeedback(isDuplicate);

    this.scanFeedbackTimeoutId = setTimeout(() => this.scanFeedback.set(undefined), SCAN_FEEDBACK_DURATION_MS);
  }

  private playFeedback(isDuplicate: boolean) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(isDuplicate ? [80, 60, 80] : 200);
    }
    this.playBeep(isDuplicate);
  }

  // Best-effort only: a browser that blocks/lacks the Web Audio API (or refuses it without a
  // prior user gesture) just stays silent - the flash overlay and vibration already carry the
  // confirmation on their own.
  private playBeep(isDuplicate: boolean) {
    try {
      const audioContextCtor = window.AudioContext;
      if (!audioContextCtor) {
        return;
      }

      const context = new audioContextCtor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = isDuplicate ? 440 : 880;
      gain.gain.value = 0.15;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.15);
      oscillator.onended = () => void context.close();
    } catch {
      // ignore - see comment above
    }
  }

  private async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLockSentinel = await navigator.wakeLock.request('screen');
      }
    } catch {
      // best-effort - screen just won't be kept awake on browsers/situations that refuse it
    }
  }

  private async releaseWakeLock() {
    try {
      await this.wakeLockSentinel?.release();
    } catch {
      // ignore - nothing to clean up if the lock is already gone
    }
    this.wakeLockSentinel = undefined;
  }

  get selectedCamera(): MediaDeviceInfo | undefined {
    return this.currentCamera();
  }

  set selectedCamera(camera: MediaDeviceInfo) {
    this.currentCamera.set(camera);
  }

}

export interface ScanFeedback {
  value: number;
  isDuplicate: boolean;
}
