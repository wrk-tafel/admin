import {Component, OnDestroy, OnInit} from '@angular/core';
import {Html5QrcodeError, Html5QrcodeResult} from "html5-qrcode/esm/core";
import {CameraDevice} from "html5-qrcode/core";
import {QRCodeReaderService} from "./camera/qrcode-reader.service";
import {ScannerApiService, ScanResult} from "../../api/scanner-api.service";
import {IFrame} from "@stomp/stompjs/src/i-frame";
import {combineLatest, Subject} from 'rxjs';

@Component({
  selector: 'tafel-scanner',
  templateUrl: 'scanner.component.html'
})
export class ScannerComponent implements OnInit, OnDestroy {

  private scannerId: number = 1;
  private availableCameras: CameraDevice[] = [];
  currentCamera: CameraDevice;

  qrCodeReaderReadyState = new Subject<boolean>();
  apiClientReadyState = new Subject<boolean>();

  readyStates =
    combineLatest(
      [this.qrCodeReaderReadyState, this.apiClientReadyState]
    );

  stateMessage: string = 'Wird geladen ...';
  stateClass: string = 'alert-info';
  lastSentText: string;

  constructor(
    private qrCodeReaderService: QRCodeReaderService,
    private scannerApiService: ScannerApiService
  ) {
  }

  ngOnInit(): void {
    this.qrCodeReaderService.getCameras().then(cameras => {
      this.availableCameras = cameras.sort((c1: CameraDevice, c2: CameraDevice) => {
        return c1.label.localeCompare(c2.label);
      });

      const savedCameraId = this.qrCodeReaderService.getLastUsedCameraId();
      if (savedCameraId) {
        this.currentCamera = this.availableCameras.find(camera => camera.id === savedCameraId);
      } else {
        const firstCamera = this.availableCameras[0];
        this.currentCamera = firstCamera;
        this.qrCodeReaderService.saveLastUsedCameraId(firstCamera.id);
      }

      this.scannerApiService.connect(this.apiClientSuccessCallback, this.apiClientErrorCallback, this.apiClientCloseCallback);

      this.qrCodeReaderService.init("qrCodeReaderBox", this.qrCodeReaderSuccessCallback, this.qrCodeReaderErrorCallback);
      this.qrCodeReaderService.start(this.currentCamera.id).then(
        () => {
          this.qrCodeReaderReadyState.next(true);
        },
        // TODO not called?
        () => {
          this.qrCodeReaderReadyState.next(false);
        }
      );

      this.readyStates.subscribe((states: boolean[]) => this.processReadyStates(states));
    });
  }

  ngOnDestroy(): void {
    this.qrCodeReaderService.stop();
    this.scannerApiService.close();
  }

  processReadyStates(states: boolean[]) {
    const qrCodeReaderReady = states[0];
    const apiClientReady = states[1];
    const bothReady = qrCodeReaderReady && apiClientReady;
    if (bothReady) {
      this.stateMessage = 'Bereit';
      this.stateClass = 'alert-info';
    } else {
      if (!qrCodeReaderReady) {
        this.stateMessage = 'Kamera konnte nicht geladen werden!';
        this.stateClass = 'alert-danger';
      } else if (!apiClientReady) {
        this.stateMessage = 'Verbindung zum Server fehlgeschlagen!';
        this.stateClass = 'alert-danger';
      }
    }
  }

  qrCodeReaderSuccessCallback = (decodedText: string, result: Html5QrcodeResult) => {
    this.stateMessage = 'Scan erfolgreich: ' + decodedText;
    this.stateClass = 'alert-success';

    if (!this.lastSentText || this.lastSentText !== decodedText) {
      const scanResult: ScanResult = {value: decodedText};
      this.scannerApiService.sendScanResult(scanResult);
      this.lastSentText = decodedText;

      // reset to retry in case of an error while transmitting/receiving
      setTimeout(() => {
        this.lastSentText = null;
      }, 3000);
    }
  };

  qrCodeReaderErrorCallback = (errorMessage: string, error: Html5QrcodeError) => {
    this.stateMessage = 'Kein gültiger QR-Code gefunden!';
    this.stateClass = 'alert-info';
  };

  apiClientSuccessCallback = (receipt: IFrame) => {
    if (receipt.command === 'CONNECTED') {
      this.apiClientReadyState.next(true);
    }
  }

  apiClientErrorCallback = (receipt: IFrame) => {
    this.apiClientReadyState.next(false);
  }

  apiClientCloseCallback = (receipt: IFrame) => {
    this.apiClientReadyState.next(false);
  }

  get selectedCamera(): CameraDevice {
    return this.currentCamera;
  }

  set selectedCamera(camera: CameraDevice) {
    this.currentCamera = camera;
    this.qrCodeReaderService.saveLastUsedCameraId(camera.id);

    this.stateMessage = 'Wird geladen ...';
    this.qrCodeReaderService.restart(camera.id).then(
      () => {
        this.qrCodeReaderReadyState.next(true);
      },
      () => {
        this.qrCodeReaderReadyState.next(false);
      }
    );
  }

}
