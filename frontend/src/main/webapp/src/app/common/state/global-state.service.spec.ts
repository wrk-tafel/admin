import { GlobalStateService } from './global-state.service';
import { DistributionItemUpdate } from '../../api/distribution-api.service';
import { of } from 'rxjs';
import { SseService } from '../sse/sse.service';
import { TestBed } from '@angular/core/testing';

describe('GlobalStateService', () => {
    function setup() {
        const sseServiceSpy = {
            listen: vi.fn().mockName("SseService.listen")
        };

        TestBed.configureTestingModule({
            providers: [
                GlobalStateService,
                { provide: SseService, useValue: sseServiceSpy }
            ]
        });

        const service = TestBed.inject(GlobalStateService);

        return { service, sseServiceSpy };
    }

    it('init calls services correctly', () => {
        const { service, sseServiceSpy } = setup();
        expect(service.getCurrentDistribution()()).toBeNull();

        const testDistributionUpdate: DistributionItemUpdate = {
            distribution: {
                id: 123,
                startedAt: new Date()
            }
        };
        sseServiceSpy.listen.mockReturnValue(of(testDistributionUpdate));

        service.init();

        expect(service.getCurrentDistribution()()).toEqual(testDistributionUpdate.distribution);

        const args = vi.mocked(sseServiceSpy.listen).mock.lastCall;
        expect(args[0]).toBe('/sse/distributions');

        const connectionStateCallback = args[1];
        connectionStateCallback(false);
        expect(service.getConnectionState()()).toBe(false);
        connectionStateCallback(true);
        expect(service.getConnectionState()()).toBe(true);
    });

});
