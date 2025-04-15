import {Html5Qrcode, Html5QrcodeSupportedFormats} from 'html5-qrcode';
import {QrcodeSuccessCallback} from 'html5-qrcode/esm/core';
import {CameraDevice} from 'html5-qrcode/esm/camera/core';
import {Html5QrcodeCameraScanConfig, Html5QrcodeFullConfig} from 'html5-qrcode/esm/html5-qrcode';
import {Html5QrcodeScannerState} from 'html5-qrcode/esm/state-manager';
import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class QRCodeReaderService {

  qrCodeReader: Html5Qrcode;
  private readonly LOCAL_STORAGE_LAST_CAMERA_ID_KEY = 'TAFEL_LAST_CAMERA_ID';
  private successCallback: QrcodeSuccessCallback;

  private readonly basicConfig: Html5QrcodeFullConfig = {
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    verbose: false
  };

  private readonly cameraConfig: Html5QrcodeCameraScanConfig = {
    fps: 10,
    qrbox: (viewfinderWidth, viewfinderHeight) => {
      return {
        width: viewfinderWidth * 0.96,
        height: viewfinderHeight * 0.96
      };
    }
  };

  async getCameras(): Promise<CameraDevice[]> {
    try {
      let cameras = await Html5Qrcode.getCameras();
      const sorted = Object.assign([], cameras).sort((c1: CameraDevice, c2: CameraDevice) => {
        return c1.label.localeCompare(c2.label);
      });
      return Promise.resolve(sorted);
    } catch (reason) {
      return await Promise.reject(reason);
    }
  }

  getCurrentCamera(cameras: CameraDevice[]) {
    const savedCameraId = this.getLastUsedCameraId();
    if (savedCameraId) {
      const camera = cameras.find(foundCamera => foundCamera.id === savedCameraId);
      if (camera) {
        return camera;
      }
    }
    return cameras[0];
  }

  saveCurrentCamera(camera: CameraDevice) {
    localStorage.setItem(this.LOCAL_STORAGE_LAST_CAMERA_ID_KEY, camera.id);
  }

  init(elementId: string, successCallback: QrcodeSuccessCallback) {
    this.successCallback = successCallback;
    this.qrCodeReader = new Html5Qrcode(elementId, this.basicConfig);
  }

  start(cameraId: string): Promise<null> {
    return this.qrCodeReader.start(cameraId, this.cameraConfig, this.successCallback, undefined);
  }

  async restart(cameraId: string): Promise<null> {
    if (this.qrCodeReader.getState() === Html5QrcodeScannerState.SCANNING) {
      return await this.qrCodeReader.stop().then(
        () => this.qrCodeReader.start(cameraId, this.cameraConfig, this.successCallback, undefined),
        () => Promise.reject()
      );
    }
    return this.qrCodeReader.start(cameraId, this.cameraConfig, this.successCallback, undefined);
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
