import {beforeEach, describe, expect, it, vi} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {SwPush} from '@angular/service-worker';
import {PushApiService, PushNotificationType, PushTestResult} from '../../api/push-api.service';
import {PushDeviceItem, PushNotificationService} from './push-notification.service';

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
    updateLabel: ReturnType<typeof vi.fn>;
    sendTestNotification: ReturnType<typeof vi.fn>;
    deleteSubscription: ReturnType<typeof vi.fn>;
    getPreferences: ReturnType<typeof vi.fn>;
    updateMasterPreference: ReturnType<typeof vi.fn>;
    updateTypePreference: ReturnType<typeof vi.fn>;
  };
  let mockWindow: { navigator: { userAgent: string } };

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
      updateLabel: vi.fn().mockReturnValue(of({id: 1, endpoint: 'https://push.example.com/x', label: 'new label'})),
      sendTestNotification: vi.fn().mockReturnValue(of({result: 'SENT'})),
      deleteSubscription: vi.fn().mockReturnValue(of(undefined)),
      getPreferences: vi.fn().mockReturnValue(of({masterEnabled: true, types: []})),
      updateMasterPreference: vi.fn().mockReturnValue(of({masterEnabled: false, types: []})),
      updateTypePreference: vi.fn().mockReturnValue(of({masterEnabled: true, types: []}))
    };
    mockWindow = {navigator: {userAgent: 'test-agent'}};

    TestBed.configureTestingModule({
      providers: [
        {provide: SwPush, useValue: mockSwPush},
        {provide: PushApiService, useValue: mockPushApiService},
        {provide: Window, useValue: mockWindow}
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

  it('isEnabled is false when there is no active browser subscription', async () => {
    mockSwPush.subscription = of(null);

    await expect(service.isEnabled()).resolves.toBe(false);
  });

  it('isEnabled is true without re-registering when the backend already knows the subscription', async () => {
    mockSwPush.subscription = of({endpoint: 'https://push.example.com/x'});
    mockPushApiService.getSubscriptions.mockReturnValue(of({
      items: [{id: 42, endpoint: 'https://push.example.com/x'}]
    }));

    await expect(service.isEnabled()).resolves.toBe(true);

    expect(mockPushApiService.createSubscription).not.toHaveBeenCalled();
  });

  it('isEnabled re-registers a browser subscription the backend has lost track of', async () => {
    const subscriptionJson = {endpoint: 'https://push.example.com/x', keys: {p256dh: 'p', auth: 'a'}};
    mockSwPush.subscription = of({endpoint: 'https://push.example.com/x', toJSON: () => subscriptionJson});
    mockPushApiService.getSubscriptions.mockReturnValue(of({items: []}));

    await expect(service.isEnabled()).resolves.toBe(true);

    expect(mockPushApiService.createSubscription).toHaveBeenCalledWith({
      endpoint: subscriptionJson.endpoint,
      p256dhKey: subscriptionJson.keys.p256dh,
      authKey: subscriptionJson.keys.auth,
      userAgent: 'test-agent'
    });
  });

  it('enable requests a subscription and registers it with the backend, including the user agent', async () => {
    const subscriptionJson = {endpoint: 'https://push.example.com/x', keys: {p256dh: 'p', auth: 'a'}};
    mockSwPush.requestSubscription.mockResolvedValue({toJSON: () => subscriptionJson});

    await service.enable();

    expect(mockSwPush.requestSubscription).toHaveBeenCalledWith({serverPublicKey: 'public-key'});
    expect(mockPushApiService.createSubscription).toHaveBeenCalledWith({
      endpoint: subscriptionJson.endpoint,
      p256dhKey: subscriptionJson.keys.p256dh,
      authKey: subscriptionJson.keys.auth,
      userAgent: 'test-agent'
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

  describe('getDevices', () => {
    it('maps backend items to devices and marks the current one', async () => {
      mockSwPush.subscription = of({endpoint: 'https://push.example.com/current'});
      mockPushApiService.getSubscriptions.mockReturnValue(of({
        items: [
          {id: 1, endpoint: 'https://push.example.com/other', userAgent: 'Firefox', label: null, createdAt: '2026-01-01T00:00:00'},
          {id: 2, endpoint: 'https://push.example.com/current', userAgent: 'Chrome', label: 'My PC', createdAt: '2026-01-02T00:00:00'}
        ]
      }));

      const result = await service.getDevices();

      expect(result).toEqual([
        {id: 2, userAgent: 'Chrome', label: 'My PC', createdAt: '2026-01-02T00:00:00', isCurrentDevice: true},
        {id: 1, userAgent: 'Firefox', label: null, createdAt: '2026-01-01T00:00:00', isCurrentDevice: false}
      ]);
    });

    it('marks no device as current when push is unsupported', async () => {
      mockSwPush.isEnabled = false;
      mockPushApiService.getSubscriptions.mockReturnValue(of({
        items: [{id: 1, endpoint: 'https://push.example.com/x', userAgent: 'Chrome', label: null, createdAt: '2026-01-01T00:00:00'}]
      }));

      const result = await service.getDevices();

      expect(result[0].isCurrentDevice).toBe(false);
    });
  });

  describe('renameDevice', () => {
    it('sends the new label to the backend', async () => {
      await service.renameDevice(7, 'Tafel 1');

      expect(mockPushApiService.updateLabel).toHaveBeenCalledWith(7, {label: 'Tafel 1'});
    });

    it('sends null to clear the label', async () => {
      await service.renameDevice(7, null);

      expect(mockPushApiService.updateLabel).toHaveBeenCalledWith(7, {label: null});
    });
  });

  describe('sendTestNotification', () => {
    it('asks the backend to push to that one device and returns the outcome', async () => {
      const result = await service.sendTestNotification(7);

      expect(mockPushApiService.sendTestNotification).toHaveBeenCalledWith(7);
      expect(result).toBe(PushTestResult.SENT);
    });

    it('passes a failed outcome through instead of throwing', async () => {
      mockPushApiService.sendTestNotification.mockReturnValue(of({result: PushTestResult.NOT_CONFIGURED}));

      expect(await service.sendTestNotification(7)).toBe(PushTestResult.NOT_CONFIGURED);
    });
  });

  describe('removeDevice', () => {
    it('deletes the backend record and unsubscribes when it is the current device', async () => {
      const device: PushDeviceItem = {
        id: 7,
        userAgent: 'Chrome',
        label: null,
        createdAt: '2026-01-01T00:00:00',
        isCurrentDevice: true
      };

      await service.removeDevice(device);

      expect(mockPushApiService.deleteSubscription).toHaveBeenCalledWith(7);
      expect(mockSwPush.unsubscribe).toHaveBeenCalled();
    });

    it('only deletes the backend record for a different device', async () => {
      const device: PushDeviceItem = {
        id: 7,
        userAgent: 'Chrome',
        label: null,
        createdAt: '2026-01-01T00:00:00',
        isCurrentDevice: false
      };

      await service.removeDevice(device);

      expect(mockPushApiService.deleteSubscription).toHaveBeenCalledWith(7);
      expect(mockSwPush.unsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('getPreferences', () => {
    it('returns the backend preferences', async () => {
      mockPushApiService.getPreferences.mockReturnValue(of({
        masterEnabled: false,
        types: [{type: PushNotificationType.DISTRIBUTION_STARTED, enabled: true}]
      }));

      await expect(service.getPreferences()).resolves.toEqual({
        masterEnabled: false,
        types: [{type: PushNotificationType.DISTRIBUTION_STARTED, enabled: true}]
      });
    });
  });

  describe('setMasterEnabled', () => {
    it('sends the new state to the backend', async () => {
      await service.setMasterEnabled(false);

      expect(mockPushApiService.updateMasterPreference).toHaveBeenCalledWith({enabled: false});
    });
  });

  describe('setTypeEnabled', () => {
    it('sends the new state for the given type to the backend', async () => {
      await service.setTypeEnabled(PushNotificationType.DISTRIBUTION_CLOSED, false);

      expect(mockPushApiService.updateTypePreference).toHaveBeenCalledWith(PushNotificationType.DISTRIBUTION_CLOSED, {enabled: false});
    });
  });

});
