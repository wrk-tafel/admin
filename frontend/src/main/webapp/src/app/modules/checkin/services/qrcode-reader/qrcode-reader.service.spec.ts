import { QRCodeReaderService } from './qrcode-reader.service';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraDevice } from 'html5-qrcode/esm/camera/core';
import { Html5QrcodeScannerState } from 'html5-qrcode/esm/state-manager';

describe('QRCodeReaderService', () => {
    const LOCAL_STORAGE_LAST_CAMERA_ID_KEY = 'TAFEL_LAST_CAMERA_ID';
    const testCameras: CameraDevice[] = [{ id: '1', label: 'cam1' }, { id: '2', label: 'a cam2' }];

    function setup() {
        localStorage.removeItem(LOCAL_STORAGE_LAST_CAMERA_ID_KEY);

        const html5QrCodeSpy = vi.spyOn(Html5Qrcode, 'getCameras').mockReturnValue(Promise.resolve(testCameras));

        const service = new QRCodeReaderService();
        const qrCodeReaderSpy = {
            start: vi.fn().mockName("QRCodeReader.start"),
            getState: vi.fn().mockName("QRCodeReader.getState"),
            stop: vi.fn().mockName("QRCodeReader.stop")
        } as any;
        service.qrCodeReader = qrCodeReaderSpy;

        return { service, html5QrCodeSpy, qrCodeReaderSpy };
    }

    it('getCameras returns result sorted by label ascending', async () => {
        const { service, html5QrCodeSpy } = setup();

        const cameras = await service.getCameras();

        expect(html5QrCodeSpy).toHaveBeenCalled();
        expect(cameras).toEqual([testCameras[1], testCameras[0]]);
    });

    it('getCurrentCamera without a saved cameraId', () => {
        const { service } = setup();
        localStorage.removeItem(LOCAL_STORAGE_LAST_CAMERA_ID_KEY);

        const currentCamera = service.getCurrentCamera(testCameras);

        expect(currentCamera).toBe(testCameras[0]);
    });

    it('getCurrentCamera with a saved cameraId', () => {
        const { service } = setup();
        localStorage.setItem(LOCAL_STORAGE_LAST_CAMERA_ID_KEY, testCameras[1].id);

        const currentCamera = service.getCurrentCamera(testCameras);

        expect(currentCamera).toBe(testCameras[1]);
    });

    it('getCurrentCamera with an invalid saved cameraId', () => {
        const { service } = setup();
        localStorage.setItem(LOCAL_STORAGE_LAST_CAMERA_ID_KEY, 'doesntexist');

        const currentCamera = service.getCurrentCamera(testCameras);

        expect(currentCamera).toEqual(testCameras[0]);
    });

    it('saveCurrentCamera done successfully', () => {
        const { service } = setup();
        localStorage.removeItem(LOCAL_STORAGE_LAST_CAMERA_ID_KEY);

        service.saveCurrentCamera(testCameras[0]);

        expect(localStorage.getItem(LOCAL_STORAGE_LAST_CAMERA_ID_KEY)).toEqual(testCameras[0].id);
    });

    it('start called correctly', () => {
        const { service, qrCodeReaderSpy } = setup();
        qrCodeReaderSpy.start.mockReturnValue(Promise.resolve());

        const testCameraId = '123';
        const promise = service.start(testCameraId);

        expect(promise).toBeDefined();
        expect(qrCodeReaderSpy.start).toHaveBeenCalledWith(testCameraId, expect.objectContaining({ fps: 10 }), undefined, undefined);
    });

    it('restart while scanning is not active', () => {
        const { service, qrCodeReaderSpy } = setup();
        qrCodeReaderSpy.getState.mockReturnValue(Html5QrcodeScannerState.UNKNOWN);
        qrCodeReaderSpy.start.mockReturnValue(Promise.resolve());

        const testCameraId = '123';
        const promise = service.restart(testCameraId);

        expect(promise).toBeDefined();
        expect(qrCodeReaderSpy.start).toHaveBeenCalledWith(testCameraId, expect.objectContaining({ fps: 10 }), undefined, undefined);
    });

    // TODO fix tests
    /*
    it('restart while scanning is active and stop was successful', () => {
      const {service, qrCodeReaderSpy} = setup();
      qrCodeReaderSpy.getState.and.returnValue(Html5QrcodeScannerState.SCANNING);
      qrCodeReaderSpy.stop.and.returnValue(Promise.resolve());
      qrCodeReaderSpy.start.and.returnValue(Promise.resolve());

      const testCameraId = '123';
      const promise = service.restart(testCameraId);

      expect(promise).toBeDefined();
      expect(qrCodeReaderSpy.stop).toHaveBeenCalled();
      expect(qrCodeReaderSpy.start).toHaveBeenCalledWith(testCameraId, jasmine.objectContaining({fps: 10}), undefined, undefined);
    });

    it('restart while scanning is active and stop failed', () => {
      const {service, qrCodeReaderSpy} = setup();
      qrCodeReaderSpy.getState.and.returnValue(Html5QrcodeScannerState.SCANNING);
      qrCodeReaderSpy.stop.and.returnValue(Promise.reject());

      const testCameraId = '123';
      const promise = service.restart(testCameraId);

      expect(promise).toBeDefined();
      expect(qrCodeReaderSpy.stop).toHaveBeenCalled();
      expect(qrCodeReaderSpy.start).not.toHaveBeenCalled();
    });
     */

    it('stop while scanning is not active', () => {
        const { service, qrCodeReaderSpy } = setup();
        qrCodeReaderSpy.getState.mockReturnValue(Html5QrcodeScannerState.UNKNOWN);

        const promise = service.stop();

        expect(promise).toBeDefined();
        expect(qrCodeReaderSpy.stop).not.toHaveBeenCalled();
    });

    it('stop while scanning is active', () => {
        const { service, qrCodeReaderSpy } = setup();
        qrCodeReaderSpy.getState.mockReturnValue(Html5QrcodeScannerState.SCANNING);
        qrCodeReaderSpy.stop.mockReturnValue(Promise.resolve());

        const promise = service.stop();

        expect(promise).toBeDefined();
        expect(qrCodeReaderSpy.stop).toHaveBeenCalled();
    });

});
