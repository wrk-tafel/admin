import { GlobalStateService } from './global-state.service';
import { DistributionItemUpdate } from '../../api/distribution-api.service';
import { of } from 'rxjs';
import { SseService } from '../sse/sse.service';
import { TestBed } from '@angular/core/testing';

describe('GlobalStateService', () => {
    function setup() {
        const sseServiceSpy = {
            listen: vi.fn().mockName('SseService.listen')
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
        expect(service.getHasReceivedDistribution()()).toBe(false);

        const testDistributionUpdate: DistributionItemUpdate = {
            distribution: {
                id: 123,
                startedAt: new Date()
            }
        };
        sseServiceSpy.listen.mockReturnValue(of(testDistributionUpdate));

        service.init();

        expect(service.getCurrentDistribution()()).toEqual(testDistributionUpdate.distribution);
        expect(service.getHasReceivedDistribution()()).toBe(true);

        const args = vi.mocked(sseServiceSpy.listen).mock.lastCall!;
        expect(args[0]).toBe('/sse/distributions');

        const connectionStateCallback = args[1];
        connectionStateCallback(false);
        expect(service.getConnectionState()()).toBe(false);
        connectionStateCallback(true);
        expect(service.getConnectionState()()).toBe(true);
    });

    // The resolver that calls init() runs again on every login, so a logout/login round trip in the
    // same tab hits this a second time. Opening another EventSource there leaks a browser
    // connection for good and eventually starves the tab of them entirely.
    it('opens the sse connection only once even when init is called repeatedly', () => {
        const { service, sseServiceSpy } = setup();
        sseServiceSpy.listen.mockReturnValue(of());

        service.init();
        service.init();
        service.init();

        expect(sseServiceSpy.listen).toHaveBeenCalledTimes(1);
    });

});
