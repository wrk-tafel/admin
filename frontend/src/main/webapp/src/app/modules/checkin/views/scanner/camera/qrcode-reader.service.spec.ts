import {QRCodeReaderService} from "./qrcode-reader.service";
import {Html5Qrcode} from "html5-qrcode";
import {CameraDevice} from "html5-qrcode/esm/core";
import {of} from "rxjs";

describe('QRCodeReaderService', () => {
  const testCameras: Array<CameraDevice> = Array({id: '1', label: 'cam1'}, {id: '2', label: 'cam2'});

  function setup() {
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

});
