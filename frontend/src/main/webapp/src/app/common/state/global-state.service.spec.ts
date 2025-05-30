import {GlobalStateService} from './global-state.service';
import {DistributionItemUpdate} from '../../api/distribution-api.service';
import {of} from 'rxjs';
import {SseService} from '../sse/sse.service';

describe('GlobalStateService', () => {
  function setup() {
    const sseServiceSpy: jasmine.SpyObj<SseService> = jasmine.createSpyObj('SseService', ['listen']);

    const service = new GlobalStateService(sseServiceSpy);

    return {service, sseServiceSpy};
  }

  it('init calls services correctly', () => {
    const {service, sseServiceSpy} = setup();
    expect(service.getCurrentDistribution().value).toBeNull();

    const testDistributionUpdate: DistributionItemUpdate = {
      distribution: {
        id: 123
      }
    };
    sseServiceSpy.listen.and.returnValue(of(testDistributionUpdate));

    service.init();

    expect(service.getCurrentDistribution().value).toEqual(testDistributionUpdate.distribution);

    const args = sseServiceSpy.listen.calls.mostRecent().args;
    expect(args[0]).toBe('/sse/distributions');

    const connectionStateCallback = args[1];
    connectionStateCallback(false);
    expect(service.getConnectionState().value).toBeFalse();
    connectionStateCallback(true);
    expect(service.getConnectionState().value).toBeTrue();
  });

});
