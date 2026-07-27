import { QRCodeReaderService } from './qrcode-reader.service';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { Result } from '@zxing/library';

describe('QRCodeReaderService', () => {
    const LOCAL_STORAGE_LAST_CAMERA_ID_KEY = 'TAFEL_LAST_CAMERA_ID';
    const testCameras = [
        { deviceId: '1', label: 'cam1' } as MediaDeviceInfo,
        { deviceId: '2', label: 'a cam2' } as MediaDeviceInfo
    ];

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function setup() {
        localStorage.removeItem(LOCAL_STORAGE_LAST_CAMERA_ID_KEY);

        const listDevicesSpy = vi.spyOn(BrowserQRCodeReader, 'listVideoInputDevices').mockResolvedValue(testCameras);

        const controlsStopSpy = vi.fn();
        const controls: IScannerControls = { stop: controlsStopSpy };
        const decodeSpy = vi.spyOn(BrowserQRCodeReader.prototype, 'decodeFromVideoDevice').mockResolvedValue(controls);

        const service = new QRCodeReaderService();

        return { service, listDevicesSpy, decodeSpy, controlsStopSpy };
    }

    it('getCameras returns result sorted by label ascending', async () => {
        const { service, listDevicesSpy } = setup();

        const cameras = await service.getCameras();

        expect(listDevicesSpy).toHaveBeenCalled();
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
        localStorage.setItem(LOCAL_STORAGE_LAST_CAMERA_ID_KEY, testCameras[1].deviceId);

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

        expect(localStorage.getItem(LOCAL_STORAGE_LAST_CAMERA_ID_KEY)).toEqual(testCameras[0].deviceId);
    });

    it('start called correctly', async () => {
        const { service, decodeSpy } = setup();
        service.init('videoElementId', vi.fn());

        const testCameraId = '123';
        await service.start(testCameraId);

        expect(decodeSpy).toHaveBeenCalledWith(testCameraId, 'videoElementId', expect.any(Function));
    });

    it('restart while scanning is not active starts scanning', async () => {
        const { service, decodeSpy } = setup();
        service.init('videoElementId', vi.fn());

        const testCameraId = '123';
        await service.restart(testCameraId);

        expect(decodeSpy).toHaveBeenCalledWith(testCameraId, 'videoElementId', expect.any(Function));
    });

    it('restart while scanning is active stops the previous scan before starting a new one', async () => {
        const { service, decodeSpy, controlsStopSpy } = setup();
        service.init('videoElementId', vi.fn());

        const testCameraId = '123';
        await service.start(testCameraId);
        await service.restart(testCameraId);

        expect(controlsStopSpy).toHaveBeenCalledTimes(1);
        expect(decodeSpy).toHaveBeenCalledTimes(2);
    });

    it('stop while scanning is not active does nothing', async () => {
        const { service, controlsStopSpy } = setup();

        await service.stop();

        expect(controlsStopSpy).not.toHaveBeenCalled();
    });

    it('stop while scanning is active stops the reader', async () => {
        const { service, controlsStopSpy } = setup();
        service.init('videoElementId', vi.fn());
        await service.start('123');

        await service.stop();

        expect(controlsStopSpy).toHaveBeenCalled();
    });

    it('invokes the success callback with the decoded text on a scan result', async () => {
        const { service, decodeSpy } = setup();
        const successCallback = vi.fn();
        service.init('videoElementId', successCallback);

        await service.start('123');
        const scanCallback = decodeSpy.mock.calls[0][2];
        scanCallback({ getText: () => '12345' } as Result, undefined, {} as IScannerControls);

        expect(successCallback).toHaveBeenCalledWith('12345');
    });

    it('does not invoke the success callback when no code was found in a frame', async () => {
        const { service, decodeSpy } = setup();
        const successCallback = vi.fn();
        service.init('videoElementId', successCallback);

        await service.start('123');
        const scanCallback = decodeSpy.mock.calls[0][2];
        scanCallback(undefined, undefined, {} as IScannerControls);

        expect(successCallback).not.toHaveBeenCalled();
    });

});
