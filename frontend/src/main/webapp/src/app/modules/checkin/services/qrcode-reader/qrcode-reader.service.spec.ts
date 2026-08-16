import { QRCodeReaderService } from './qrcode-reader.service';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { Result } from '@zxing/library';

describe('QRCodeReaderService', () => {
    const LOCAL_STORAGE_LAST_CAMERA_ID_KEY = 'tafel.qrcodeReader.lastCameraId';
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

    it('getCurrentCamera without a saved cameraId prefers a rear-facing camera over the first device', () => {
        const { service } = setup();
        localStorage.removeItem(LOCAL_STORAGE_LAST_CAMERA_ID_KEY);
        const camerasWithRear = [
            { deviceId: 'front', label: 'Front Camera' } as MediaDeviceInfo,
            { deviceId: 'back', label: 'camera2 0, facing back' } as MediaDeviceInfo
        ];

        const currentCamera = service.getCurrentCamera(camerasWithRear);

        expect(currentCamera).toBe(camerasWithRear[1]);
    });

    it('getCurrentCamera falls back to the first device when no label matches a rear camera', () => {
        const { service } = setup();
        localStorage.removeItem(LOCAL_STORAGE_LAST_CAMERA_ID_KEY);

        const currentCamera = service.getCurrentCamera(testCameras);

        expect(currentCamera).toBe(testCameras[0]);
    });

    it('getCurrentCamera prefers a saved cameraId over the rear-camera heuristic', () => {
        const { service } = setup();
        const camerasWithRear = [
            { deviceId: 'front', label: 'Front Camera' } as MediaDeviceInfo,
            { deviceId: 'back', label: 'Back Camera' } as MediaDeviceInfo
        ];
        localStorage.setItem(LOCAL_STORAGE_LAST_CAMERA_ID_KEY, 'front');

        const currentCamera = service.getCurrentCamera(camerasWithRear);

        expect(currentCamera).toBe(camerasWithRear[0]);
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

    it('stop while a start is still in flight immediately stops the camera once it opens instead of leaving it running', async () => {
        const { service, decodeSpy, controlsStopSpy } = setup();
        service.init('videoElementId', vi.fn());

        let resolveDecode!: (controls: IScannerControls) => void;
        decodeSpy.mockReturnValueOnce(new Promise<IScannerControls>(resolve => {
            resolveDecode = resolve;
        }));

        const startPromise = service.start('123');
        await service.stop();

        expect(controlsStopSpy).not.toHaveBeenCalled();

        resolveDecode({ stop: controlsStopSpy });
        await startPromise;

        expect(controlsStopSpy).toHaveBeenCalledTimes(1);
        expect(service.controls).toBeUndefined();
    });

    it('restart while a previous start is still in flight stops the stale camera once it opens and keeps the new one', async () => {
        const { service, decodeSpy } = setup();
        service.init('videoElementId', vi.fn());

        const staleControlsStopSpy = vi.fn();
        let resolveStaleDecode!: (controls: IScannerControls) => void;
        decodeSpy.mockReturnValueOnce(new Promise<IScannerControls>(resolve => {
            resolveStaleDecode = resolve;
        }));

        const startPromise = service.start('123');

        const freshControlsStopSpy = vi.fn();
        decodeSpy.mockResolvedValueOnce({ stop: freshControlsStopSpy });
        const restartPromise = service.restart('456');
        await restartPromise;

        const freshControls = service.controls;
        expect(freshControls?.stop).toBe(freshControlsStopSpy);

        resolveStaleDecode({ stop: staleControlsStopSpy });
        await startPromise;

        expect(staleControlsStopSpy).toHaveBeenCalledTimes(1);
        expect(freshControlsStopSpy).not.toHaveBeenCalled();
        expect(service.controls).toBe(freshControls);
    });

    it('isTorchSupported is false before scanning has started', () => {
        const { service } = setup();

        expect(service.isTorchSupported()).toBe(false);
    });

    it('isTorchSupported reflects whether the active stream exposes switchTorch', async () => {
        const { service, decodeSpy } = setup();
        service.init('videoElementId', vi.fn());
        decodeSpy.mockResolvedValueOnce({ stop: vi.fn(), switchTorch: vi.fn().mockResolvedValue(undefined) });

        await service.start('123');

        expect(service.isTorchSupported()).toBe(true);
    });

    it('setTorch delegates to the active controls switchTorch when supported', async () => {
        const { service, decodeSpy } = setup();
        service.init('videoElementId', vi.fn());
        const switchTorchSpy = vi.fn().mockResolvedValue(undefined);
        decodeSpy.mockResolvedValueOnce({ stop: vi.fn(), switchTorch: switchTorchSpy });
        await service.start('123');

        await service.setTorch(true);

        expect(switchTorchSpy).toHaveBeenCalledWith(true);
    });

    it('setTorch does nothing when the active camera has no torch support', async () => {
        const { service } = setup();
        service.init('videoElementId', vi.fn());
        await service.start('123');

        await expect(service.setTorch(true)).resolves.toBeUndefined();
    });

});
