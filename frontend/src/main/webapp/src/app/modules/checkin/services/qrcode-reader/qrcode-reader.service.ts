import {BrowserQRCodeReader, IScannerControls} from '@zxing/browser';
import {Service} from '@angular/core';

@Service()
export class QRCodeReaderService {

  private readonly reader = new BrowserQRCodeReader(undefined, {
    delayBetweenScanAttempts: 100,
    delayBetweenScanSuccess: 100
  });
  private readonly LOCAL_STORAGE_LAST_CAMERA_ID_KEY = 'TAFEL_LAST_CAMERA_ID';

  private videoElementId!: string;
  private successCallback!: (decodedText: string) => void;
  controls?: IScannerControls;

  async getCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const cameras = await BrowserQRCodeReader.listVideoInputDevices();
      const sorted = Object.assign([], cameras).sort((c1: MediaDeviceInfo, c2: MediaDeviceInfo) => c1.label.localeCompare(c2.label));
      return Promise.resolve(sorted);
    } catch (reason) {
      return await Promise.reject(reason);
    }
  }

  getCurrentCamera(cameras: MediaDeviceInfo[]) {
    const savedCameraId = this.getLastUsedCameraId();
    if (savedCameraId) {
      const camera = cameras.find(foundCamera => foundCamera.deviceId === savedCameraId);
      if (camera) {
        return camera;
      }
    }
    return cameras[0];
  }

  saveCurrentCamera(camera: MediaDeviceInfo) {
    localStorage.setItem(this.LOCAL_STORAGE_LAST_CAMERA_ID_KEY, camera.deviceId);
  }

  init(elementId: string, successCallback: (decodedText: string) => void) {
    this.videoElementId = elementId;
    this.successCallback = successCallback;
  }

  start(cameraId: string): Promise<void> {
    return this.startScanning(cameraId);
  }

  async restart(cameraId: string): Promise<void> {
    if (this.controls) {
      this.controls.stop();
      this.controls = undefined;
    }
    return this.startScanning(cameraId);
  }

  async stop(): Promise<void> {
    if (this.controls) {
      this.controls.stop();
      this.controls = undefined;
    }
  }

  private async startScanning(cameraId: string): Promise<void> {
    this.controls = await this.reader.decodeFromVideoDevice(cameraId, this.videoElementId, (result) => {
      if (result) {
        this.successCallback(result.getText());
      }
    });
  }

  private getLastUsedCameraId(): string | null {
    return localStorage.getItem(this.LOCAL_STORAGE_LAST_CAMERA_ID_KEY);
  }

}
