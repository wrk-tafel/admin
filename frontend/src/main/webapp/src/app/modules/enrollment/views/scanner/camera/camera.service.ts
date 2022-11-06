import {Injectable} from '@angular/core';
import {Html5Qrcode} from "html5-qrcode";
import {CameraDevice} from "html5-qrcode/esm/core";

@Injectable({
  providedIn: 'root'
})
export class CameraService {

  private LOCAL_STORAGE_LAST_CAMERA_ID_KEY = 'TAFEL_LAST_CAMERA_ID';

  getCameras(): Promise<Array<CameraDevice>> {
    return Html5Qrcode.getCameras();
  }

  saveLastUsedCameraId(cameraId: string) {
    localStorage.setItem(this.LOCAL_STORAGE_LAST_CAMERA_ID_KEY, cameraId);
  }

  getLastUsedCameraId(): string {
    return localStorage.getItem(this.LOCAL_STORAGE_LAST_CAMERA_ID_KEY);
  }

}
