import { GlobalStateService } from './global-state.service';
import { DistributionItemUpdate } from '../../api/distribution-api.service';
import { of, Subject } from 'rxjs';
import { SseService } from '../sse/sse.service';
import { TestBed } from '@angular/core/testing';

describe('GlobalStateService', () => {
    function setup() {
        const sseServiceSpy = {
            topic: vi.fn().mockName('SseService.topic')
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

    // The service listens to two topics; each test feeds the stream it is about and leaves the other idle.
    function mockTopics(sseServiceSpy: { topic: ReturnType<typeof vi.fn> }, streams: Record<string, unknown>) {
        sseServiceSpy.topic.mockImplementation((name: string) => streams[name] ?? new Subject());
    }

    function callsOf(sseServiceSpy: { topic: ReturnType<typeof vi.fn> }, name: string) {
        return sseServiceSpy.topic.mock.calls.filter(call => call[0] === name);
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
        mockTopics(sseServiceSpy, {distribution: of(testDistributionUpdate)});

        service.init();

        expect(service.getCurrentDistribution()()).toEqual(testDistributionUpdate.distribution);
        expect(service.getHasReceivedDistribution()()).toBe(true);

        const args = callsOf(sseServiceSpy, 'distribution')[0];
        expect(args[0]).toBe('distribution');

        const connectionStateCallback = args[1].connectionStateCallback;
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
        mockTopics(sseServiceSpy, {distribution: of()});

        service.init();
        service.init();
        service.init();

        expect(callsOf(sseServiceSpy, 'distribution')).toHaveLength(1);
    });

    // The server sends the current state once, when a stream opens. A reset that left the old stream
    // running would leave the next login in the same tab with no distribution - shown as "closed" -
    // until the next start or close.
    it('closes the stream on reset and opens a new one on the next init', () => {
        const { service, sseServiceSpy } = setup();
        const firstStream = new Subject<DistributionItemUpdate>();
        const secondStream = new Subject<DistributionItemUpdate>();
        let distributionCalls = 0;
        sseServiceSpy.topic.mockImplementation((name: string) =>
            name === 'distribution' ? (distributionCalls++ === 0 ? firstStream : secondStream) : new Subject());
        const distribution = { id: 123, startedAt: new Date() };

        service.init();
        firstStream.next({ distribution });
        service.reset();

        expect(firstStream.observed).toBe(false);
        expect(service.getCurrentDistribution()()).toBeNull();
        expect(service.getHasReceivedDistribution()()).toBe(false);

        service.init();
        expect(callsOf(sseServiceSpy, 'distribution')).toHaveLength(2);
        secondStream.next({ distribution });

        expect(service.getCurrentDistribution()()).toEqual(distribution);
        expect(service.getHasReceivedDistribution()()).toBe(true);
    });

    it('reports the connection as down after reset', () => {
        const { service, sseServiceSpy } = setup();
        mockTopics(sseServiceSpy, {distribution: new Subject<DistributionItemUpdate>()});
        service.init();
        callsOf(sseServiceSpy, 'distribution')[0][1].connectionStateCallback(true);

        service.reset();

        expect(service.getConnectionState()()).toBe(false);
    });

    it('counts the signals of the notifications topic and starts over after reset', () => {
        const { service, sseServiceSpy } = setup();
        const signals = new Subject<unknown>();
        mockTopics(sseServiceSpy, {notifications: signals});
        service.init();
        expect(service.getNotificationsVersion()()).toBe(0);

        signals.next({});
        signals.next({});
        expect(service.getNotificationsVersion()()).toBe(2);

        service.reset();
        expect(signals.observed).toBe(false);
        expect(service.getNotificationsVersion()()).toBe(0);
    });

    it('exposes the registered customer count of the open distribution', () => {
        const { service, sseServiceSpy } = setup();
        const updates = new Subject<DistributionItemUpdate>();
        mockTopics(sseServiceSpy, {distribution: updates});
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
        mockTopics(sseServiceSpy, {distribution: updates});
        service.init();

        const startedAt = new Date('2026-09-19T10:00:00Z');
        updates.next({ distribution: { id: 123, startedAt }, registeredCustomers: 1 });
        const first = service.getCurrentDistribution()();
        updates.next({ distribution: { id: 123, startedAt }, registeredCustomers: 2 });

        expect(service.getCurrentDistribution()()).toBe(first);
    });

    it('drops the registered customer count on reset', () => {
        const { service, sseServiceSpy } = setup();
        mockTopics(sseServiceSpy, {distribution: of({ distribution: { id: 1, startedAt: new Date() }, registeredCustomers: 5 })});
        service.init();

        service.reset();

        expect(service.getRegisteredCustomers()()).toBeNull();
    });

});
