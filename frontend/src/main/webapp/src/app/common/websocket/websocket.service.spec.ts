import {PlatformLocation} from '@angular/common';
import {CompatClient, Stomp} from '@stomp/stompjs';
import {WebsocketService} from './websocket.service';

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

    const clientSpy: jasmine.SpyObj<CompatClient> = jasmine.createSpyObj('RxStomp', ['activate', 'publish', 'deactivate']);
    const stompSpy = spyOn(Stomp, 'client').and.returnValue(clientSpy);

    const service = new WebsocketService(platformLocationSpy);

    return {service, platformLocationSpy, stompSpy, clientSpy};
  }

  it('connect creates the client', () => {
    const {service, stompSpy, clientSpy} = setup();

    service.connect();

    expect(stompSpy).toHaveBeenCalledWith('ws://testhost:1234/subpath/ws-api');
    expect(clientSpy.connect).toHaveBeenCalled();
  });

  it('connect with empty pathname creates correct baseUrl', () => {
    overwriteTestPathname = '/';
    const {service, stompSpy} = setup();

    service.connect();

    expect(stompSpy).toHaveBeenCalledWith('ws://testhost:1234/ws-api');

    overwriteTestPathname = undefined;
  });

  it('connect with https creates correct baseUrl', () => {
    overwriteProtocol = 'https:';
    const {service, stompSpy} = setup();

    service.connect();

    expect(stompSpy).toHaveBeenCalledWith('wss://testhost:1234/subpath/ws-api');

    overwriteProtocol = undefined;
  });

  it('close forceDisconnects the client', () => {
    const {service, clientSpy} = setup();
    service.connect();

    service.close();

    expect(clientSpy.forceDisconnect).toHaveBeenCalled();
  });

});
