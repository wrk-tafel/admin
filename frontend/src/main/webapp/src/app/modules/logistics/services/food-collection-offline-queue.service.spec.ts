import {TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {Observable, of, throwError} from 'rxjs';
import {FoodCollectionOfflineQueueService} from './food-collection-offline-queue.service';
import {FoodCollectionsApiService} from '../../../api/food-collections-api.service';
import {ConnectivityService} from '../../../common/connectivity/connectivity.service';

describe('FoodCollectionOfflineQueueService', () => {

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

  function setup(options: {online?: boolean; initialStorage?: Record<string, string>} = {}) {
    const onlineSignal = signal(options.online ?? true);
    const patchItems = vi.fn().mockName('FoodCollectionsApiService.patchItems').mockReturnValue(of(undefined));

    TestBed.configureTestingModule({
      providers: [
        FoodCollectionOfflineQueueService,
        {provide: FoodCollectionsApiService, useValue: {patchItems}},
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

    const service = TestBed.inject(FoodCollectionOfflineQueueService);
    return {service, patchItems, setOnline: (value: boolean) => onlineSignal.set(value)};
  }

  it('sends immediately when online and removes the item once acknowledged', () => {
    const {service, patchItems} = setup({online: true});

    service.enqueue(1, 2, 3, 5);

    expect(patchItems).toHaveBeenCalledWith(1, {categoryId: 3, shopId: 2, amount: 5});
    expect(service.pendingCount()).toBe(0);
  });

  it('queues without sending while offline', () => {
    const {service, patchItems} = setup({online: false});

    service.enqueue(1, 2, 3, 5);

    expect(patchItems).not.toHaveBeenCalled();
    expect(service.pendingCount()).toBe(1);
    expect(service.getPendingAmount(1, 2, 3)).toBe(5);
  });

  it('flushes the queue once connectivity returns', () => {
    const {service, patchItems, setOnline} = setup({online: false});

    service.enqueue(1, 2, 3, 5);
    expect(patchItems).not.toHaveBeenCalled();

    setOnline(true);
    TestBed.flushEffects();

    expect(patchItems).toHaveBeenCalledWith(1, {categoryId: 3, shopId: 2, amount: 5});
    expect(service.pendingCount()).toBe(0);
  });

  it('keeps only the latest amount per (routeId, shopId, categoryId)', () => {
    const {service} = setup({online: false});

    service.enqueue(1, 2, 3, 5);
    service.enqueue(1, 2, 3, 9);

    expect(service.pendingCount()).toBe(1);
    expect(service.getPendingAmount(1, 2, 3)).toBe(9);
  });

  it('leaves the item queued and stops flushing on a failed send', () => {
    const {service, patchItems} = setup({online: true});
    patchItems.mockReturnValue(throwError(() => new Error('network error')));

    service.enqueue(1, 2, 3, 5);

    expect(service.pendingCount()).toBe(1);
    expect(service.getPendingAmount(1, 2, 3)).toBe(5);
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
        FoodCollectionOfflineQueueService,
        {provide: FoodCollectionsApiService, useValue: {patchItems: vi.fn().mockReturnValue(of(undefined))}},
        {provide: ConnectivityService, useValue: {isOnline: () => signal(false).asReadonly()}},
        {provide: Window, useValue: window1}
      ]
    });
    const service1 = TestBed.inject(FoodCollectionOfflineQueueService);
    service1.enqueue(1, 2, 3, 5);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        FoodCollectionOfflineQueueService,
        {provide: FoodCollectionsApiService, useValue: {patchItems: vi.fn().mockReturnValue(of(undefined))}},
        {provide: ConnectivityService, useValue: {isOnline: () => signal(false).asReadonly()}},
        {provide: Window, useValue: window1}
      ]
    });
    const service2 = TestBed.inject(FoodCollectionOfflineQueueService);

    expect(service2.pendingCount()).toBe(1);
    expect(service2.getPendingAmount(1, 2, 3)).toBe(5);
  });

  it('does not start a second send while one is already in flight', () => {
    const {service, patchItems} = setup({online: true});
    let resolveFirst: (() => void) | undefined;
    patchItems.mockReturnValue(new Observable<void>(subscriber => {
      resolveFirst = () => {
        subscriber.next();
        subscriber.complete();
      };
    }));

    service.enqueue(1, 2, 3, 1);
    service.enqueue(1, 5, 6, 2);

    expect(patchItems).toHaveBeenCalledTimes(1);

    resolveFirst!();

    expect(patchItems).toHaveBeenCalledTimes(2);
  });

  it('returns all pending items for a shop', () => {
    const {service} = setup({online: false});

    service.enqueue(1, 2, 3, 5);
    service.enqueue(1, 2, 4, 7);
    service.enqueue(1, 9, 3, 1);

    expect(service.getPendingForShop(1, 2)).toEqual(
      expect.arrayContaining([
        {categoryId: 3, shopId: 2, amount: 5},
        {categoryId: 4, shopId: 2, amount: 7}
      ])
    );
    expect(service.getPendingForShop(1, 2).length).toBe(2);
  });

});
