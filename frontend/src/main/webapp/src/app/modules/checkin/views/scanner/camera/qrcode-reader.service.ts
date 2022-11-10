import {Injectable} from '@angular/core';
import {Html5Qrcode, Html5QrcodeSupportedFormats} from "html5-qrcode";
import {CameraDevice, QrcodeErrorCallback, QrcodeSuccessCallback} from "html5-qrcode/esm/core";
import {Html5QrcodeCameraScanConfig, Html5QrcodeFullConfig} from "html5-qrcode/esm/html5-qrcode";
import {Html5QrcodeScannerState} from "html5-qrcode/esm/state-manager";

@Injectable()
export class QRCodeReaderService {

  private LOCAL_STORAGE_LAST_CAMERA_ID_KEY = 'TAFEL_LAST_CAMERA_ID';
  qrCodeReader: Html5Qrcode;
  private successCallback: QrcodeSuccessCallback;
  private errorCallback: QrcodeErrorCallback;

  private basicConfig: Html5QrcodeFullConfig = {
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    verbose: false
  };
  private cameraConfig: Html5QrcodeCameraScanConfig = {
    fps: 10,
    qrbox: (viewfinderWidth, viewfinderHeight) => {
      return {
        width: viewfinderWidth * 0.96,
        height: viewfinderHeight * 0.96
      }
    }
  };

  getCameras(): Promise<CameraDevice[]> {
    return Html5Qrcode.getCameras()
      .then((cameras: CameraDevice[]) => {
        const sorted = Object.assign([], cameras).sort((c1: CameraDevice, c2: CameraDevice) => {
          return c1.label.localeCompare(c2.label);
        });
        return Promise.resolve(sorted);
      })
      .catch(reason => Promise.reject(reason));
  }

  getCurrentCamera(cameras: CameraDevice[]) {
    const savedCameraId = this.getLastUsedCameraId();
    if (savedCameraId) {
      const camera = cameras.find(camera => camera.id === savedCameraId);
      if (camera) {
        return camera;
      }
    }
    return cameras[0];
  }

  saveCurrentCamera(camera: CameraDevice) {
    localStorage.setItem(this.LOCAL_STORAGE_LAST_CAMERA_ID_KEY, camera.id);
  }

  init(elementId: string, successCallback: QrcodeSuccessCallback, errorCallback: QrcodeErrorCallback) {
    this.successCallback = successCallback;
    this.errorCallback = errorCallback;
    this.qrCodeReader = new Html5Qrcode(elementId, this.basicConfig);
  }

  start(cameraId: string): Promise<null> {
    return this.qrCodeReader.start(cameraId, this.cameraConfig, this.successCallback, this.errorCallback);
  }

  async restart(cameraId: string): Promise<null> {
    if (this.qrCodeReader.getState() === Html5QrcodeScannerState.SCANNING) {
      return await this.qrCodeReader.stop().then(
        () => this.qrCodeReader.start(cameraId, this.cameraConfig, this.successCallback, this.errorCallback),
        () => Promise.reject()
      );
    }
    return this.qrCodeReader.start(cameraId, this.cameraConfig, this.successCallback, this.errorCallback);
  }

  stop(): Promise<void> {
    if (this.qrCodeReader.getState() === Html5QrcodeScannerState.SCANNING) {
      return this.qrCodeReader.stop();
    }
    return Promise.resolve();
  }

  private getLastUsedCameraId(): string {
    return localStorage.getItem(this.LOCAL_STORAGE_LAST_CAMERA_ID_KEY);
  }

}
