import { GlobalStateService } from './global-state.service';
import { DistributionItemUpdate } from '../../api/distribution-api.service';
import { of, Subject } from 'rxjs';
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

    // The server sends the current state once, when a stream opens. A reset that left the old stream
    // running would leave the next login in the same tab with no distribution - shown as "closed" -
    // until the next start or close.
    it('closes the stream on reset and opens a new one on the next init', () => {
        const { service, sseServiceSpy } = setup();
        const firstStream = new Subject<DistributionItemUpdate>();
        const secondStream = new Subject<DistributionItemUpdate>();
        sseServiceSpy.listen.mockReturnValueOnce(firstStream).mockReturnValueOnce(secondStream);
        const distribution = { id: 123, startedAt: new Date() };

        service.init();
        firstStream.next({ distribution });
        service.reset();

        expect(firstStream.observed).toBe(false);
        expect(service.getCurrentDistribution()()).toBeNull();
        expect(service.getHasReceivedDistribution()()).toBe(false);

        service.init();
        expect(sseServiceSpy.listen).toHaveBeenCalledTimes(2);
        secondStream.next({ distribution });

        expect(service.getCurrentDistribution()()).toEqual(distribution);
        expect(service.getHasReceivedDistribution()()).toBe(true);
    });

    it('reports the connection as down after reset', () => {
        const { service, sseServiceSpy } = setup();
        sseServiceSpy.listen.mockReturnValue(new Subject<DistributionItemUpdate>());
        service.init();
        sseServiceSpy.listen.mock.lastCall![1](true);

        service.reset();

        expect(service.getConnectionState()()).toBe(false);
    });

    it('exposes the registered customer count of the open distribution', () => {
        const { service, sseServiceSpy } = setup();
        const updates = new Subject<DistributionItemUpdate>();
        sseServiceSpy.listen.mockReturnValue(updates);
        expect(service.getRegisteredCustomers()()).toBeNull();

        service.init();
        const distribution = { id: 123, startedAt: new Date() };
        updates.next({ distribution, registeredCustomers: 7 });
        expect(service.getRegisteredCustomers()()).toBe(7);

        updates.next({ distribution, registeredCustomers: 8 });
        expect(service.getRegisteredCustomers()()).toBe(8);

        // a start/close event without a count must not wipe (or reset to zero) a newer count
        updates.next({ distribution });
        expect(service.getRegisteredCustomers()()).toBe(8);

        updates.next({ distribution: null });
        expect(service.getRegisteredCustomers()()).toBeNull();
    });

    // The server re-sends the message on every registration; effects keyed on the distribution
    // (which reset the statistics/notes forms) must not re-run for a distribution that did not change.
    it('keeps the distribution object while only the customer count changes', () => {
        const { service, sseServiceSpy } = setup();
        const updates = new Subject<DistributionItemUpdate>();
        sseServiceSpy.listen.mockReturnValue(updates);
        service.init();

        const startedAt = new Date('2026-09-19T10:00:00Z');
        updates.next({ distribution: { id: 123, startedAt }, registeredCustomers: 1 });
        const first = service.getCurrentDistribution()();
        updates.next({ distribution: { id: 123, startedAt }, registeredCustomers: 2 });

        expect(service.getCurrentDistribution()()).toBe(first);
    });

    it('drops the registered customer count on reset', () => {
        const { service, sseServiceSpy } = setup();
        sseServiceSpy.listen.mockReturnValue(of({ distribution: { id: 1, startedAt: new Date() }, registeredCustomers: 5 }));
        service.init();

        service.reset();

        expect(service.getRegisteredCustomers()()).toBeNull();
    });

});
