import {PlatformLocation} from '@angular/common';
import {WebsocketService} from './websocket.service';
import {RxStomp} from '@stomp/rx-stomp';

describe('WebsocketService', () => {
  let overwriteProtocol: string;
  let overwriteTestPathname: string;

  function setup() {
    const platformLocationSpy: jasmine.SpyObj<PlatformLocation> = jasmine.createSpyObj('PlatformLocation', [], {
      hostname: 'testhost',
      port: '1234',
      pathname: overwriteTestPathname ? overwriteTestPathname : '/subpath',
      protocol: overwriteProtocol ? overwriteProtocol : 'http:'
    });

    const clientSpy: jasmine.SpyObj<RxStomp> = jasmine.createSpyObj('RxStomp', ['configure', 'activate', 'publish', 'deactivate']);

    const service = new WebsocketService(platformLocationSpy);
    service.client = clientSpy;

    return {service, platformLocationSpy, clientSpy};
  }

  it('client configured correctly', () => {
    overwriteTestPathname = undefined;
    const {service, clientSpy} = setup();

    service.init();

    expect(clientSpy.configure).toHaveBeenCalledWith({
      brokerURL: 'ws://testhost:1234/subpath/api/websockets'
    });
    overwriteTestPathname = undefined;
  });

  it('client configured correctly with empty pathname', () => {
    overwriteTestPathname = '/';
    const {service, clientSpy} = setup();

    service.init();

    expect(clientSpy.configure).toHaveBeenCalledWith(jasmine.objectContaining({
      brokerURL: 'ws://testhost:1234/api/websockets'
    }));
    overwriteTestPathname = undefined;
  });

  it('client configured correctly with https', () => {
    overwriteProtocol = 'https:';
    overwriteTestPathname = undefined;
    const {service, clientSpy} = setup();

    service.init();

    expect(clientSpy.configure).toHaveBeenCalledWith(jasmine.objectContaining({
      brokerURL: 'wss://testhost:1234/subpath/api/websockets'
    }));
    overwriteTestPathname = undefined;
    overwriteProtocol = undefined;
  });

  it('connect calls activate', () => {
    const {service, clientSpy} = setup();

    service.connect();

    expect(clientSpy.activate).toHaveBeenCalled();
  });

  it('publish called', () => {
    const {service, clientSpy} = setup();

    const parameters = {destination: '/test123'};
    service.publish(parameters);

    expect(clientSpy.publish).toHaveBeenCalledWith(parameters);
  });

  it('close called', () => {
    const {service, clientSpy} = setup();

    service.close();

    expect(clientSpy.deactivate).toHaveBeenCalled();
  });

});
