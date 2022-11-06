import {Component, OnInit} from '@angular/core';
import {Html5Qrcode, Html5QrcodeSupportedFormats} from "html5-qrcode";
import {Html5QrcodeError, Html5QrcodeResult} from "html5-qrcode/esm/core";
import {Html5QrcodeFullConfig} from "html5-qrcode/esm/html5-qrcode";
import {CameraDevice} from "html5-qrcode/core";
import {CameraService} from "./camera/camera.service";

@Component({
  selector: 'tafel-scanner',
  templateUrl: 'scanner.component.html'
})
export class ScannerComponent implements OnInit {

  private availableCameras: CameraDevice[] = [];
  private selectedCamera: CameraDevice;

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
        this.selectedCamera = this.availableCameras.find(camera => camera.id === savedCameraId)
      }

      this.stateMessage = 'Bereit';

      // TODO remove
      console.log(cameras);
      // TODO remove
    });
  }

  private initQrCodeReader() {
    const config: Html5QrcodeFullConfig = {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false
    };

    /*
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      fps: 25,
      qrbox: this.qrBoxSizingFunction,
      rememberLastUsedCamera: true,
    */

    this.qrCodeReader = new Html5Qrcode("codeReaderBox", config);

    // html5QrcodeScanner.render(successCallback, errorCallback);
  }

  private qrBoxSizingFunction = (viewfinderWidth, viewfinderHeight) => {
    return {
      width: viewfinderWidth * 0.96,
      height: viewfinderHeight * 0.96
    };
  }

  private successCallback = (decodedText: string, result: Html5QrcodeResult) => {
    this.stateMessage = decodedText;
    console.log("SUCCESS", decodedText, result);
  };

  private errorCallback = (errorMessage: string, error: Html5QrcodeError) => {
    this.stateMessage = errorMessage;
    console.log("ERROR", errorMessage, error);
  };

}
