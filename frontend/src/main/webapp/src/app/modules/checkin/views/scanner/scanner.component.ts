import {Component, OnDestroy, OnInit} from '@angular/core';
import {QRCodeReaderService} from './camera/qrcode-reader.service';
import {RxStompState} from '@stomp/rx-stomp';
import {WebsocketService} from '../../../../common/websocket/websocket.service';
import {CameraDevice} from 'html5-qrcode/esm/camera/core';
import {Html5QrcodeResult} from 'html5-qrcode/core';

@Component({
  selector: 'tafel-scanner',
  templateUrl: 'scanner.component.html'
})
export class ScannerComponent implements OnInit, OnDestroy {

  scannerId: number = 1;
  availableCameras: CameraDevice[] = [];
  currentCamera: CameraDevice;

  qrCodeReaderReady: boolean = false;
  apiClientReady: boolean = false;

  lastSentText: string;

  constructor(
    private qrCodeReaderService: QRCodeReaderService,
    private websocketService: WebsocketService
  ) {
  }

  ngOnInit(): void {
    this.websocketService.getConnectionState().subscribe((connectionState: RxStompState) => {
      this.processApiConnectionState(connectionState);
    });

    this.qrCodeReaderService.getCameras().then(cameras => {
      this.availableCameras = cameras;
      this.currentCamera = this.qrCodeReaderService.getCurrentCamera(cameras);

      this.qrCodeReaderService.init('qrCodeReaderBox', this.qrCodeReaderSuccessCallback);
      const promise = this.qrCodeReaderService.start(this.currentCamera.id);
      this.processQrCodeReaderPromise(promise);
    });

    this.websocketService.init();
    this.websocketService.connect();
  }

  ngOnDestroy(): void {
    this.qrCodeReaderService.stop();
    this.websocketService.close();
  }

  async processQrCodeReaderPromise(promise: Promise<null>) {
    await promise.then(
      () => {
        this.qrCodeReaderReady = true;
      },
      () => {
        this.qrCodeReaderReady = false;
      }
    );
  }

  qrCodeReaderSuccessCallback = (decodedText: string, result: Html5QrcodeResult) => {
    if (!this.lastSentText || this.lastSentText !== decodedText) {
      const scanResult: ScanResult = {value: decodedText};
      this.websocketService.publish({destination: '/app/scanners/result', body: JSON.stringify(scanResult)});
      this.lastSentText = decodedText;

      // reset to retry in case of an error while transmitting/receiving
      setTimeout(() => {
        this.lastSentText = null;
      }, 3000);
    }
  }

  processApiConnectionState(state: RxStompState) {
    if (state === RxStompState.OPEN) {
      this.apiClientReady = true;
    } else {
      this.apiClientReady = false;
    }
  }

  get selectedCamera(): CameraDevice {
    return this.currentCamera;
  }

  set selectedCamera(camera: CameraDevice) {
    this.currentCamera = camera;
    this.qrCodeReaderService.saveCurrentCamera(camera);

    const promise = this.qrCodeReaderService.restart(camera.id);
    this.processQrCodeReaderPromise(promise);
  }

}

export interface ScanResult {
  value: string;
}
