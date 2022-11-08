import {ScannerApiService} from "./scanner-api.service";
import {PlatformLocation} from "@angular/common";
import {CompatClient, Stomp} from "@stomp/stompjs";

describe('ScannerApiService', () => {
  const testHost: string = 'testhost';
  const testPort: string = '1234';

  function setup() {
    const platformLocationSpy: jasmine.SpyObj<PlatformLocation> = jasmine.createSpyObj('PlatformLocation', [], {
      hostname: testHost,
      port: testPort
    });

    const clientSpy: jasmine.SpyObj<CompatClient> = jasmine.createSpyObj('CompatClient', ['connect', 'send', 'forceDisconnect']);
    const stompSpy = spyOn(Stomp, 'client').and.returnValue(clientSpy);

    const service = new ScannerApiService(platformLocationSpy);

    return {service, stompSpy, clientSpy};
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

    expect(stompSpy).toHaveBeenCalledWith('ws://testhost:1234/ws-api');
    expect(clientSpy.connect).toHaveBeenCalledWith({}, connectCallback, errorCallback, closeCallback);
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
