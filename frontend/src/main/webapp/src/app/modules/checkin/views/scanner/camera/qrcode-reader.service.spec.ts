import {QRCodeReaderService} from "./qrcode-reader.service";
import {Html5Qrcode} from "html5-qrcode";
import {CameraDevice} from "html5-qrcode/esm/core";
import {of} from "rxjs";

describe('QRCodeReaderService', () => {
  const LOCAL_STORAGE_LAST_CAMERA_ID_KEY = 'TAFEL_LAST_CAMERA_ID';
  const testCameras: Array<CameraDevice> = Array({id: '1', label: 'cam1'}, {id: '2', label: 'cam2'});

  function setup() {
    localStorage.removeItem(LOCAL_STORAGE_LAST_CAMERA_ID_KEY);

    const qrCodeSpy = spyOn(Html5Qrcode, 'getCameras').and.returnValue(of(testCameras).toPromise());

    const service = new QRCodeReaderService();
    return {service, qrCodeSpy};
  }

  it('getCameras returns correct result', async () => {
    const {service, qrCodeSpy} = setup();

    const cameras = await service.getCameras();

    expect(qrCodeSpy).toHaveBeenCalled();
    expect(cameras).toEqual(testCameras);
  });

  it('lastUsedCameraId saved and loaded successfully', () => {
    const {service} = setup();
    const testCameraId = '123';

    expect(localStorage.getItem(LOCAL_STORAGE_LAST_CAMERA_ID_KEY)).toBe(null);

    service.saveLastUsedCameraId(testCameraId);

    expect(service.getLastUsedCameraId()).toBe(testCameraId);

    expect(localStorage.getItem(LOCAL_STORAGE_LAST_CAMERA_ID_KEY)).toBe(testCameraId);
  });

});
