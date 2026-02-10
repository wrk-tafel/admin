import { GlobalStateService } from './global-state.service';
import { DistributionItemUpdate } from '../../api/distribution-api.service';
import { of } from 'rxjs';
import { SseService } from '../sse/sse.service';

describe('GlobalStateService', () => {
    function setup() {
        const sseServiceSpy = {
            listen: vi.fn().mockName("SseService.listen")
        };

        const service = new GlobalStateService(sseServiceSpy as any);

        return { service, sseServiceSpy };
    }

    it('init calls services correctly', () => {
        const { service, sseServiceSpy } = setup();
        expect(service.getCurrentDistribution().value).toBeNull();

        const testDistributionUpdate: DistributionItemUpdate = {
            distribution: {
                id: 123,
                startedAt: new Date()
            }
        };
        sseServiceSpy.listen.mockReturnValue(of(testDistributionUpdate));

        service.init();

        expect(service.getCurrentDistribution().value).toEqual(testDistributionUpdate.distribution);

        const args = vi.mocked(sseServiceSpy.listen).mock.lastCall;
        expect(args[0]).toBe('/sse/distributions');

        const connectionStateCallback = args[1];
        connectionStateCallback(false);
        expect(service.getConnectionState().value).toBe(false);
        connectionStateCallback(true);
        expect(service.getConnectionState().value).toBe(true);
    });

});
