import {TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {firstValueFrom, Observable, of, throwError} from 'rxjs';
import {RouteGuidanceOfflineQueueService} from './route-guidance-offline-queue.service';
import {RouteApiService, RouteGuidanceStop} from '../../../api/route-api.service';
import {ConnectivityService} from '../../../common/connectivity/connectivity.service';

describe('RouteGuidanceOfflineQueueService', () => {

  function fakeLocalStorage(initial: Record<string, string> = {}) {
    const store = {...initial};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      }
    };
  }

  function syncedStop(overrides: Partial<RouteGuidanceStop> = {}): RouteGuidanceStop {
    return {
      stopId: 200,
      time: '12:00:00',
      completed: true,
      completedAt: '2026-08-13T08:00:00',
      completedBy: 'E2E Test',
      returnItems: [],
      ...overrides
    };
  }

  function setup(options: {online?: boolean; initialStorage?: Record<string, string>} = {}) {
    const onlineSignal = signal(options.online ?? true);
    const setStopCompletion = vi.fn().mockName('RouteApiService.setStopCompletion').mockReturnValue(of(syncedStop()));

    TestBed.configureTestingModule({
      providers: [
        RouteGuidanceOfflineQueueService,
        {provide: RouteApiService, useValue: {setStopCompletion}},
        {provide: ConnectivityService, useValue: {isOnline: () => onlineSignal.asReadonly()}},
        {
          provide: Window,
          useValue: {
            localStorage: fakeLocalStorage(options.initialStorage),
            addEventListener: vi.fn()
          }
        }
      ]
    });

    const service = TestBed.inject(RouteGuidanceOfflineQueueService);
    return {service, setStopCompletion, setOnline: (value: boolean) => onlineSignal.set(value)};
  }

  it('sends immediately when online and removes the item once acknowledged', () => {
    const {service, setStopCompletion} = setup({online: true});

    service.enqueue(1, 200, true);

    expect(setStopCompletion).toHaveBeenCalledWith(1, 200, true);
    expect(service.pendingCount()).toBe(0);
  });

  it('queues without sending while offline', () => {
    const {service, setStopCompletion} = setup({online: false});

    service.enqueue(1, 200, true);

    expect(setStopCompletion).not.toHaveBeenCalled();
    expect(service.pendingCount()).toBe(1);
    expect(service.isPending(1, 200)).toBe(true);
  });

  it('flushes the queue once connectivity returns', () => {
    const {service, setStopCompletion, setOnline} = setup({online: false});

    service.enqueue(1, 200, true);
    expect(setStopCompletion).not.toHaveBeenCalled();

    setOnline(true);
    TestBed.flushEffects();

    expect(setStopCompletion).toHaveBeenCalledWith(1, 200, true);
    expect(service.pendingCount()).toBe(0);
  });

  it('keeps only the latest completion flag per (routeId, stopId)', () => {
    const {service} = setup({online: false});

    service.enqueue(1, 200, true);
    service.enqueue(1, 200, false);

    expect(service.pendingCount()).toBe(1);
    expect(service.isPending(1, 200)).toBe(true);
  });

  it('leaves the item queued and stops flushing on a failed send', () => {
    const {service, setStopCompletion} = setup({online: true});
    setStopCompletion.mockReturnValue(throwError(() => new Error('network error')));

    service.enqueue(1, 200, true);

    expect(service.pendingCount()).toBe(1);
    expect(service.isPending(1, 200)).toBe(true);
  });

  it('emits the synced stop with the server-assigned completedAt/completedBy once sent', async () => {
    const {service, setStopCompletion} = setup({online: true});
    const answer = syncedStop({completedBy: 'Hr. Fahrer'});
    setStopCompletion.mockReturnValue(of(answer));

    const synced = firstValueFrom(service.stopSynced$);
    service.enqueue(1, 200, true);

    await expect(synced).resolves.toEqual({routeId: 1, stop: answer});
  });

  it('persists the queue to localStorage and restores it on next construction', () => {
    const store: Record<string, string> = {};
    const window1 = {
      localStorage: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        }
      },
      addEventListener: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        RouteGuidanceOfflineQueueService,
        {provide: RouteApiService, useValue: {setStopCompletion: vi.fn().mockReturnValue(of(syncedStop()))}},
        {provide: ConnectivityService, useValue: {isOnline: () => signal(false).asReadonly()}},
        {provide: Window, useValue: window1}
      ]
    });
    const service1 = TestBed.inject(RouteGuidanceOfflineQueueService);
    service1.enqueue(1, 200, true);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        RouteGuidanceOfflineQueueService,
        {provide: RouteApiService, useValue: {setStopCompletion: vi.fn().mockReturnValue(of(syncedStop()))}},
        {provide: ConnectivityService, useValue: {isOnline: () => signal(false).asReadonly()}},
        {provide: Window, useValue: window1}
      ]
    });
    const service2 = TestBed.inject(RouteGuidanceOfflineQueueService);

    expect(service2.pendingCount()).toBe(1);
    expect(service2.isPending(1, 200)).toBe(true);
  });

  it('does not start a second send while one is already in flight', () => {
    const {service, setStopCompletion} = setup({online: true});
    let resolveFirst: (() => void) | undefined;
    setStopCompletion.mockReturnValue(new Observable<RouteGuidanceStop>(subscriber => {
      resolveFirst = () => {
        subscriber.next(syncedStop());
        subscriber.complete();
      };
    }));

    service.enqueue(1, 200, true);
    service.enqueue(1, 210, true);

    expect(setStopCompletion).toHaveBeenCalledTimes(1);

    resolveFirst!();

    expect(setStopCompletion).toHaveBeenCalledTimes(2);
  });

  it('resends a value that changed again while the previous send for that key was in flight', () => {
    const {service, setStopCompletion} = setup({online: true});
    const resolvers: (() => void)[] = [];
    setStopCompletion.mockImplementation(() => new Observable<RouteGuidanceStop>(subscriber => {
      resolvers.push(() => {
        subscriber.next(syncedStop());
        subscriber.complete();
      });
    }));

    service.enqueue(1, 200, true);
    // Overwrites the still-in-flight send's value before it resolves - the resulting queue holds
    // false, but the request already under way was built from the stale value true.
    service.enqueue(1, 200, false);

    expect(setStopCompletion).toHaveBeenCalledTimes(1);
    expect(setStopCompletion).toHaveBeenNthCalledWith(1, 1, 200, true);

    resolvers[0]();

    expect(setStopCompletion).toHaveBeenCalledTimes(2);
    expect(setStopCompletion).toHaveBeenNthCalledWith(2, 1, 200, false);
    expect(service.pendingCount()).toBe(1);

    resolvers[1]();

    expect(service.pendingCount()).toBe(0);
  });

});
