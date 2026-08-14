import {BrowserQRCodeReader, IScannerControls} from '@zxing/browser';
import {Service} from '@angular/core';

@Service()
export class QRCodeReaderService {

  private readonly reader = new BrowserQRCodeReader(undefined, {
    delayBetweenScanAttempts: 250,
    delayBetweenScanSuccess: 250
  });
  private readonly LOCAL_STORAGE_LAST_CAMERA_ID_KEY = 'TAFEL_LAST_CAMERA_ID';
  // Chrome/Firefox/Safari all put a hint in MediaDeviceInfo.label once camera permission was
  // granted (e.g. "camera2 0, facing back", "Back Camera", "Rückkamera") - there is no
  // cross-browser way to read facingMode before a stream is opened, so this label heuristic is
  // what "default to the rear camera" has to work with.
  private readonly REAR_CAMERA_LABEL_PATTERN = /back|rear|environment|rück/i;

  private videoElementId!: string;
  private successCallback!: (decodedText: string) => void;
  controls?: IScannerControls;
  // Bumped by stop()/startScanning() so a startScanning() call whose decodeFromVideoDevice()
  // is still in flight can tell, once it resolves, whether it was superseded (or stopped) in
  // the meantime and must immediately stop the stream it just opened instead of adopting it -
  // otherwise that camera stream keeps decoding forever with no reference left to stop it.
  private operationToken = 0;

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

    const rearCamera = cameras.find(camera => this.REAR_CAMERA_LABEL_PATTERN.test(camera.label));
    return rearCamera ?? cameras[0];
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
    this.operationToken++;
    if (this.controls) {
      this.controls.stop();
      this.controls = undefined;
    }
  }

  private async startScanning(cameraId: string): Promise<void> {
    const token = ++this.operationToken;
    const controls = await this.reader.decodeFromVideoDevice(cameraId, this.videoElementId, (result) => {
      if (result) {
        this.successCallback(result.getText());
      }
    });

    if (token !== this.operationToken) {
      // stop()/restart() was called again before this camera stream finished starting up -
      // it's already superseded (or the reader should be stopped), so shut it down right away.
      controls.stop();
      return;
    }
    this.controls = controls;
  }

  private getLastUsedCameraId(): string | null {
    return localStorage.getItem(this.LOCAL_STORAGE_LAST_CAMERA_ID_KEY);
  }

  // `controls.switchTorch` is only set by @zxing/browser once the currently open stream's track
  // reports `torch` among its capabilities - so this doubles as the "does the active camera
  // support a torch at all" check the UI needs to decide whether to show the toggle.
  isTorchSupported(): boolean {
    return typeof this.controls?.switchTorch === 'function';
  }

  async setTorch(on: boolean): Promise<void> {
    await this.controls?.switchTorch?.(on);
  }

}
