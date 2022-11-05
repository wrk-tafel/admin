import {Component, OnInit} from '@angular/core';
import {Html5Qrcode, Html5QrcodeSupportedFormats} from "html5-qrcode";
import {Html5QrcodeError, Html5QrcodeResult} from "html5-qrcode/esm/core";
import {Html5QrcodeFullConfig} from "html5-qrcode/esm/html5-qrcode";
import {CameraDevice} from "html5-qrcode/core";
import {FormControl, FormGroup, Validators} from "@angular/forms";

@Component({
  selector: 'tafel-scanner',
  templateUrl: 'scanner.component.html'
})
export class ScannerComponent implements OnInit {

  private loadingActive: boolean = true;
  private availableCameras: CameraDevice[];
  private qrCodeReader: Html5Qrcode;
  private output: string;

  form = new FormGroup({
    camera: new FormControl({}, Validators.required),
  });

  ngOnInit(): void {
    Html5Qrcode.getCameras().then(cameras => {
      this.availableCameras = cameras;
      this.loadingActive = false;

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
    this.output = decodedText;
    console.log("SUCCESS", decodedText, result);
  };

  private errorCallback = (errorMessage: string, error: Html5QrcodeError) => {
    this.output = errorMessage;
    console.log("ERROR", errorMessage, error);
  };

  private compareCamera(c1: CameraDevice, c2: CameraDevice): boolean {
    return c1 && c2 ? c1.id === c2.id : c1 === c2;
  }

}
