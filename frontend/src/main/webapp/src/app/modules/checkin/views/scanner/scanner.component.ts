import {Component, computed, inject, OnDestroy, OnInit, signal, WritableSignal} from '@angular/core';
import {QRCodeReaderService} from '../../services/qrcode-reader/qrcode-reader.service';
import {RxStompState} from '@stomp/rx-stomp';
import {WebsocketService} from '../../../../common/websocket/websocket.service';
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
import {CommonModule} from '@angular/common';

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
    FormSelectDirective,
    CommonModule
  ],
  providers: [
    QRCodeReaderService
  ],
  standalone: true
})
export class ScannerComponent implements OnInit, OnDestroy {
  private readonly qrCodeReaderService = inject(QRCodeReaderService);
  private readonly websocketService = inject(WebsocketService);

  scannerId: number;
  availableCameras: CameraDevice[] = [];
  currentCamera: CameraDevice;
  lastSentText: string;

  readonly qrCodeReaderReady: WritableSignal<boolean> = signal(false);
  readonly qrCodeReaderReadyColor = computed(() => {
    return this.qrCodeReaderReady() ? 'success' : 'danger';
  });

  readonly apiClientReady: WritableSignal<boolean> = signal(false);
  readonly apiClientReadyColor = computed(() => {
    return this.apiClientReady() ? 'success' : 'danger';
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

  async ngOnInit(): Promise<void> {
    const wsPromise = this.websocketService.getConnectionState().subscribe((state: RxStompState) => {
      this.processApiConnectionState(state);
    });

    const qrPromise = this.qrCodeReaderService.getCameras().then(async cameras => {
      this.availableCameras = cameras;
      this.currentCamera = this.qrCodeReaderService.getCurrentCamera(cameras);

      this.qrCodeReaderService.init('qrCodeReaderBox', this.qrCodeReaderSuccessCallback);
      const promise = this.qrCodeReaderService.start(this.currentCamera.id);
      await this.processQrCodeReaderPromise(promise);
    });

    await Promise.all([wsPromise, qrPromise])
  }

  async ngOnDestroy(): Promise<void> {
    await this.qrCodeReaderService.stop();
  }

  async processQrCodeReaderPromise(promise: Promise<null>) {
    await promise.then(
      () => {
        this.qrCodeReaderReady.set(true);
      },
      () => {
        this.qrCodeReaderReady.set(false);
      }
    );
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  qrCodeReaderSuccessCallback = (decodedText: string, result: Html5QrcodeResult) => {
    if (this.apiClientReady() && (!this.lastSentText || this.lastSentText !== decodedText)) {
      const scanResult: ScanResult = {value: +decodedText};
      this.websocketService.publish({
        destination: `/topic/scanners/${this.scannerId}/results`,
        body: JSON.stringify(scanResult)
      });
      this.lastSentText = decodedText;

      // reset to retry in case of an error while transmitting/receiving
      setTimeout(() => {
        this.lastSentText = null;
      }, 3000);
    }
  }

  processApiConnectionState(state: RxStompState) {
    if (state === RxStompState.OPEN) {
      this.processClientRegistration();
    } else {
      this.apiClientReady.set(false);
    }
  }

  processClientRegistration() {
    this.websocketService.watch('/user/queue/scanners/registration').subscribe((message) => {
        const registration: ScannerRegistration = JSON.parse(message.body);
        this.scannerId = registration.scannerId;
        this.apiClientReady.set(true);
      }
    );
    this.websocketService.publish({destination: '/app/scanners/register'});
  }

}

export interface ScannerRegistration {
  scannerId: number;
}

export interface ScannerList {
  scannerIds: number[];
}

export interface ScanResult {
  value: number;
}
