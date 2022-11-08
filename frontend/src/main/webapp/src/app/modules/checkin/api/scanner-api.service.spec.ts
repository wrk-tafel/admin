import {ScannerApiService} from "./scanner-api.service";
import {PlatformLocation} from "@angular/common";
import {CompatClient, Stomp} from "@stomp/stompjs";

describe('ScannerApiService', () => {
  let overwriteTestPathname: string;

  function setup() {
    const platformLocationSpy: jasmine.SpyObj<PlatformLocation> = jasmine.createSpyObj('PlatformLocation', [], {
      hostname: 'testhost',
      port: '1234',
      pathname: overwriteTestPathname ? overwriteTestPathname : '/subpath'
    });

    const clientSpy: jasmine.SpyObj<CompatClient> = jasmine.createSpyObj('CompatClient', ['connect', 'send', 'forceDisconnect']);
    const stompSpy = spyOn(Stomp, 'client').and.returnValue(clientSpy);

    const service = new ScannerApiService(platformLocationSpy);

    return {service, platformLocationSpy, stompSpy, clientSpy};
  }

  it('connect creates the client', () => {
    const {service, stompSpy, clientSpy} = setup();

    const connectCallback = () => {
    };
    const errorCallback = () => {
    };
    const closeCallback = () => {
    };
    service.connect(connectCallback, errorCallback, closeCallback);

    expect(stompSpy).toHaveBeenCalledWith('ws://testhost:1234/subpath/ws-api');
    expect(clientSpy.connect).toHaveBeenCalledWith({}, connectCallback, errorCallback, closeCallback);
  });

  it('connect with empty pathname creates correct baseUrl', () => {
    overwriteTestPathname = '/';
    const {service, stompSpy} = setup();

    service.connect(null, null, null);

    expect(stompSpy).toHaveBeenCalledWith('ws://testhost:1234/ws-api');

    overwriteTestPathname = undefined;
  });

  it('sendScanResult transported successfully', () => {
    const {service, clientSpy} = setup();

    const testResult = {value: 'test-value'};
    service.sendScanResult(testResult);

    expect(clientSpy.send).toHaveBeenCalledWith('/app/scanners/result', {}, JSON.stringify(testResult));
  });

  it('close forceDisconnects the client', () => {
    const {service, clientSpy} = setup();

    service.close();

    expect(clientSpy.forceDisconnect).toHaveBeenCalled();
  });

});
