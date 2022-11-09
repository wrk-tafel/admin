import {QRCodeReaderService} from "./qrcode-reader.service";
import {Html5Qrcode} from "html5-qrcode";
import {CameraDevice} from "html5-qrcode/esm/core";
import {of} from "rxjs";
import {Html5QrcodeScannerState} from "html5-qrcode/esm/state-manager";

describe('QRCodeReaderService', () => {
  const LOCAL_STORAGE_LAST_CAMERA_ID_KEY = 'TAFEL_LAST_CAMERA_ID';
  const testCameras: Array<CameraDevice> = Array({id: '1', label: 'cam1'}, {id: '2', label: 'cam2'});

  function setup() {
    localStorage.removeItem(LOCAL_STORAGE_LAST_CAMERA_ID_KEY);

    const html5QrCodeSpy = spyOn(Html5Qrcode, 'getCameras').and.returnValue(of(testCameras).toPromise());

    const service = new QRCodeReaderService();
    const qrCodeReaderSpy = jasmine.createSpyObj('QRCodeReader', ['start', 'getState', 'stop']);
    service.qrCodeReader = qrCodeReaderSpy;

    return {service, html5QrCodeSpy, qrCodeReaderSpy};
  }

  it('getCameras returns correct result', async () => {
    const {service, html5QrCodeSpy} = setup();

    const cameras = await service.getCameras();

    expect(html5QrCodeSpy).toHaveBeenCalled();
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

  it('start called correctly', () => {
    const {service, qrCodeReaderSpy} = setup();

    const testCameraId = '123';
    service.start(testCameraId);

    expect(qrCodeReaderSpy.start).toHaveBeenCalledWith(testCameraId, jasmine.objectContaining({fps: 10}), undefined, undefined);
  });

  it('restart while scanning is not active', () => {
    const {service, qrCodeReaderSpy} = setup();
    qrCodeReaderSpy.getState.and.returnValue(Html5QrcodeScannerState.UNKNOWN);

    const testCameraId = '123';
    service.restart(testCameraId);

    expect(qrCodeReaderSpy.start).toHaveBeenCalledWith(testCameraId, jasmine.objectContaining({fps: 10}), undefined, undefined);
  });

  it('restart while scanning is active and stop successful', async () => {
    const {service, qrCodeReaderSpy} = setup();
    qrCodeReaderSpy.getState.and.returnValue(Html5QrcodeScannerState.SCANNING);
    qrCodeReaderSpy.stop.and.returnValue(Promise.resolve());
    qrCodeReaderSpy.start.and.returnValue(Promise.resolve(null));

    const testCameraId = '123';
    const resultPromise = await service.restart(testCameraId);

    expect(resultPromise).toBeDefined();
    expect(qrCodeReaderSpy.stop).toHaveBeenCalled();
    expect(qrCodeReaderSpy.start).toHaveBeenCalledWith(testCameraId, jasmine.objectContaining({fps: 10}), undefined, undefined);
  });

  it('restart while scanning is active and stop failed', () => {
    const {service, qrCodeReaderSpy} = setup();
    qrCodeReaderSpy.getState.and.returnValue(Html5QrcodeScannerState.SCANNING);
    qrCodeReaderSpy.stop.and.returnValue(Promise.reject());

    const testCameraId = '123';
    const resultPromise = service.restart(testCameraId);

    expect(resultPromise).toBeDefined();
    expect(qrCodeReaderSpy.stop).toHaveBeenCalled();
    expect(qrCodeReaderSpy.start).not.toHaveBeenCalled();
  });

  it('stop while scanning is not active', () => {
    const {service, qrCodeReaderSpy} = setup();
    qrCodeReaderSpy.getState.and.returnValue(Html5QrcodeScannerState.UNKNOWN);

    service.stop();

    expect(qrCodeReaderSpy.stop).not.toHaveBeenCalled();
  });

  it('stop while scanning is active', () => {
    const {service, qrCodeReaderSpy} = setup();
    qrCodeReaderSpy.getState.and.returnValue(Html5QrcodeScannerState.SCANNING);

    service.stop();

    expect(qrCodeReaderSpy.stop).toHaveBeenCalled();
  });

});
