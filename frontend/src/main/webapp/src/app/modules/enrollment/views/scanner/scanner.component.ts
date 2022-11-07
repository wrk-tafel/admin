import {Component, OnInit} from '@angular/core';
import {Html5Qrcode} from "html5-qrcode";
import {Html5QrcodeError, Html5QrcodeResult} from "html5-qrcode/esm/core";
import {CameraDevice} from "html5-qrcode/core";
import {CameraService} from "./camera/camera.service";
import {ScannerApiService, ScanResult} from "../../api/scanner-api.service";

@Component({
  selector: 'tafel-scanner',
  templateUrl: 'scanner.component.html'
})
export class ScannerComponent implements OnInit {

  private scannerId: number = 1;
  private availableCameras: CameraDevice[] = [];
  private currentCamera: CameraDevice;

  private qrCodeReader: Html5Qrcode;

  private stateMessage: string = 'Wird geladen ...';
  private stateClass: string = 'alert-info';

  constructor(
    private cameraService: CameraService,
    private scannerApiService: ScannerApiService
  ) {
  }

  ngOnInit(): void {
    this.cameraService.getCameras().then(cameras => {
      this.availableCameras = cameras.sort((c1: CameraDevice, c2: CameraDevice) => {
        return c1.label.localeCompare(c2.label);
      });

      const savedCameraId = this.cameraService.getLastUsedCameraId();
      if (savedCameraId) {
        this.currentCamera = this.availableCameras.find(camera => camera.id === savedCameraId);
      } else {
        const firstCamera = this.availableCameras[0];
        this.currentCamera = firstCamera;
        this.cameraService.saveLastUsedCameraId(firstCamera.id);
      }

      this.cameraService.initQrCodeReader("codeReaderBox", this.successCallback, this.errorCallback);

      // TODO handle
      this.scannerApiService.connect();

      this.processCameraStart(this.cameraService.startQrCodeReader(this.currentCamera.id));
    });
  }

  private processCameraStart(promise: Promise<null>) {
    promise.then(
      () => {
        this.stateMessage = 'Bereit';
        this.stateClass = 'alert-info';
      }, () => {
        // TODO not called
        this.stateMessage = 'Kamera konnte nicht geladen werden!';
        this.stateClass = 'alert-danger';
      }
    )
  }

  private successCallback = (decodedText: string, result: Html5QrcodeResult) => {
    this.stateMessage = 'Scan erfolgreich - ' + decodedText;
    this.stateClass = 'alert-success';

    // TODO add wait before re-sending
    const scanResult: ScanResult = {content: decodedText};
    this.scannerApiService.sendScanResult(scanResult);
  };

  private errorCallback = (errorMessage: string, error: Html5QrcodeError) => {
    this.stateMessage = 'Kein QR-Code gefunden';
    this.stateClass = 'alert-info';
  };

  get selectedCamera(): CameraDevice {
    return this.currentCamera;
  }

  set selectedCamera(camera: CameraDevice) {
    this.currentCamera = camera;
    this.cameraService.saveLastUsedCameraId(camera.id);

    this.stateMessage = 'Wird geladen ...';
    this.processCameraStart(this.cameraService.restartQrCodeReader(camera.id));
  }

}
