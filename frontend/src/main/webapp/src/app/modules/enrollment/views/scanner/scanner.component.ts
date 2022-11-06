import {Component, OnInit} from '@angular/core';
import {Html5Qrcode, Html5QrcodeSupportedFormats} from "html5-qrcode";
import {Html5QrcodeError, Html5QrcodeResult} from "html5-qrcode/esm/core";
import {Html5QrcodeCameraScanConfig, Html5QrcodeFullConfig} from "html5-qrcode/esm/html5-qrcode";
import {CameraDevice} from "html5-qrcode/core";
import {CameraService} from "./camera/camera.service";

@Component({
  selector: 'tafel-scanner',
  templateUrl: 'scanner.component.html'
})
export class ScannerComponent implements OnInit {

  private availableCameras: CameraDevice[] = [];
  private currentCamera: CameraDevice;

  private qrCodeReader: Html5Qrcode;

  private stateMessage: string = 'Wird geladen ...';

  constructor(
    private cameraService: CameraService
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

      this.initQrCodeReader();
      this.startQrCodeReader();
    });
  }

  private initQrCodeReader() {
    const basicConfig: Html5QrcodeFullConfig = {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false
    };
    this.qrCodeReader = new Html5Qrcode("codeReaderBox", basicConfig);
  }

  private startQrCodeReader() {
    const cameraConfig: Html5QrcodeCameraScanConfig = {
      fps: 10,
      qrbox: this.qrBoxSizingFunction
    };

    if (this.qrCodeReader.isScanning) {
      this.qrCodeReader.stop().then(() => {
        this.qrCodeReader.start(this.currentCamera.id, cameraConfig, this.successCallback, this.errorCallback).then(() => {
          this.stateMessage = 'Bereit';
        });
      });
    } else {
      this.qrCodeReader.start(this.currentCamera.id, cameraConfig, this.successCallback, this.errorCallback).then(() => {
        this.stateMessage = 'Bereit';
      });
    }
  }

  private qrBoxSizingFunction = (viewfinderWidth, viewfinderHeight) => {
    return {
      width: viewfinderWidth * 0.96,
      height: viewfinderHeight * 0.96
    };
  }

  private successCallback = (decodedText: string, result: Html5QrcodeResult) => {
    this.stateMessage = 'Scan erfolgreich - ' + decodedText;
  };

  private errorCallback = (errorMessage: string, error: Html5QrcodeError) => {
    this.stateMessage = 'Kein QR-Code gefunden!';
  };

  get selectedCamera(): CameraDevice {
    return this.currentCamera;
  }

  set selectedCamera(camera: CameraDevice) {
    this.currentCamera = camera;
    this.cameraService.saveLastUsedCameraId(camera.id);

    this.stateMessage = 'Wird geladen ...';
    this.startQrCodeReader();
  }
}
