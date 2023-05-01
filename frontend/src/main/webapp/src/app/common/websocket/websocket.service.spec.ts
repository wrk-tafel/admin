import {WebsocketService} from './websocket.service';
import {RxStomp, RxStompState} from '@stomp/rx-stomp';
import {BehaviorSubject, EMPTY, Observable} from 'rxjs';
import {IMessage} from '@stomp/stompjs';
import {UrlHelperService} from '../util/url-helper.service';

describe('WebsocketService', () => {

  function setup() {
    const urlHelperSpy: jasmine.SpyObj<UrlHelperService> = jasmine.createSpyObj('UrlHelperService', ['getBaseUrl']);
    const clientSpy: jasmine.SpyObj<RxStomp> = jasmine.createSpyObj('RxStomp', ['configure', 'activate', 'publish', 'deactivate', 'watch']);

    const service = new WebsocketService(urlHelperSpy);
    service.client = clientSpy;

    return {service, urlHelperSpy, clientSpy};
  }

  it('client configured correctly', () => {
    const {service, urlHelperSpy, clientSpy} = setup();
    urlHelperSpy.getBaseUrl.and.returnValue('https://test:1234/subpath');
    spyOn(service, 'getConnectionState').and.returnValue(new BehaviorSubject(RxStompState.OPEN));

    service.connect().then();

    expect(clientSpy.configure).toHaveBeenCalledWith({
      brokerURL: 'wss://test:1234/subpath/api/websockets'
    });
    expect(clientSpy.activate).toHaveBeenCalled();
  });

  it('publish called', () => {
    const {service, clientSpy} = setup();

    const parameters = {destination: '/test123'};
    service.publish(parameters);

    expect(clientSpy.publish).toHaveBeenCalledWith(parameters);
  });

  it('watch called', () => {
    const {service, clientSpy} = setup();
    const mockResult: Observable<IMessage> = EMPTY;
    clientSpy.watch.and.returnValue(mockResult);

    const destination = '/test123';
    const result = service.watch(destination);

    expect(clientSpy.watch).toHaveBeenCalledWith(destination);
    expect(result).toBe(mockResult);
  });

  it('close called', () => {
    const {service, clientSpy} = setup();

    service.close();

    expect(clientSpy.deactivate).toHaveBeenCalled();
  });

});
