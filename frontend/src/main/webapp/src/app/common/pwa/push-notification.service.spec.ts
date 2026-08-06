import {beforeEach, describe, expect, it, vi} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {SwPush} from '@angular/service-worker';
import {PushApiService} from '../../api/push-api.service';
import {PushNotificationService} from './push-notification.service';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let mockSwPush: {
    isEnabled: boolean;
    subscription: unknown;
    requestSubscription: ReturnType<typeof vi.fn>;
    unsubscribe: ReturnType<typeof vi.fn>;
  };
  let mockPushApiService: {
    getPublicKey: ReturnType<typeof vi.fn>;
    getSubscriptions: ReturnType<typeof vi.fn>;
    createSubscription: ReturnType<typeof vi.fn>;
    deleteSubscription: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockSwPush = {
      isEnabled: true,
      subscription: of(null),
      requestSubscription: vi.fn(),
      unsubscribe: vi.fn().mockResolvedValue(undefined)
    };
    mockPushApiService = {
      getPublicKey: vi.fn().mockReturnValue(of({publicKey: 'public-key'})),
      getSubscriptions: vi.fn().mockReturnValue(of({items: []})),
      createSubscription: vi.fn().mockReturnValue(of({id: 1, endpoint: 'https://push.example.com/x'})),
      deleteSubscription: vi.fn().mockReturnValue(of(undefined))
    };

    TestBed.configureTestingModule({
      providers: [
        {provide: SwPush, useValue: mockSwPush},
        {provide: PushApiService, useValue: mockPushApiService}
      ]
    });
    service = TestBed.runInInjectionContext(() => new PushNotificationService());
  });

  it('isSupported reflects SwPush.isEnabled', () => {
    mockSwPush.isEnabled = false;
    expect(service.isSupported()).toBe(false);

    mockSwPush.isEnabled = true;
    expect(service.isSupported()).toBe(true);
  });

  it('isEnabled is false when unsupported', async () => {
    mockSwPush.isEnabled = false;

    await expect(service.isEnabled()).resolves.toBe(false);
  });

  it('isEnabled reflects whether a subscription currently exists', async () => {
    mockSwPush.subscription = of({endpoint: 'https://push.example.com/x'});

    await expect(service.isEnabled()).resolves.toBe(true);
  });

  it('enable requests a subscription and registers it with the backend', async () => {
    const subscriptionJson = {endpoint: 'https://push.example.com/x', keys: {p256dh: 'p', auth: 'a'}};
    mockSwPush.requestSubscription.mockResolvedValue({toJSON: () => subscriptionJson});

    await service.enable();

    expect(mockSwPush.requestSubscription).toHaveBeenCalledWith({serverPublicKey: 'public-key'});
    expect(mockPushApiService.createSubscription).toHaveBeenCalledWith({
      endpoint: subscriptionJson.endpoint,
      p256dhKey: subscriptionJson.keys.p256dh,
      authKey: subscriptionJson.keys.auth
    });
  });

  it('disable removes the matching backend subscription and unsubscribes', async () => {
    mockSwPush.subscription = of({endpoint: 'https://push.example.com/x'});
    mockPushApiService.getSubscriptions.mockReturnValue(of({
      items: [{id: 42, endpoint: 'https://push.example.com/x'}]
    }));

    await service.disable();

    expect(mockPushApiService.deleteSubscription).toHaveBeenCalledWith(42);
    expect(mockSwPush.unsubscribe).toHaveBeenCalled();
  });

  it('disable does nothing when there is no active subscription', async () => {
    mockSwPush.subscription = of(null);

    await service.disable();

    expect(mockPushApiService.deleteSubscription).not.toHaveBeenCalled();
    expect(mockSwPush.unsubscribe).not.toHaveBeenCalled();
  });

});
