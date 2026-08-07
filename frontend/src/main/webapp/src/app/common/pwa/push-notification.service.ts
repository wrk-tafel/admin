import {inject, Service} from '@angular/core';
import {SwPush} from '@angular/service-worker';
import {firstValueFrom} from 'rxjs';
import {
  PushApiService,
  PushNotificationType,
  PushPreferencesResponse,
  PushSubscriptionRequest,
  PushTestResult
} from '../../api/push-api.service';

export interface PushDeviceItem {
  id: number;
  userAgent: string | null;
  label: string | null;
  createdAt: string;
  isCurrentDevice: boolean;
}

/**
 * Wraps `SwPush` (browser Push API via the Angular service worker) together with the backend
 * `/api/push` endpoints, so registering/unregistering this device is a single call from the UI
 * side. Subscribing is per-device, not per-login - `enable()`/`disable()` act on whichever device
 * the call runs on.
 */
@Service()
export class PushNotificationService {
  private readonly swPush = inject(SwPush);
  private readonly pushApiService = inject(PushApiService);
  private readonly window = inject(Window);

  isSupported(): boolean {
    return this.swPush.isEnabled;
  }

  /**
   * The browser's own PushManager subscription and the backend's `push_subscriptions` row for it
   * can drift apart independently of the user ever touching the toggle - e.g. the backend's table
   * gets wiped (a dev/test data reset), or the row was pruned after a push service answered
   * EXPIRED, while the browser still holds a perfectly live subscription. Rather than surface that
   * as a silently-broken "on" toggle (no notifications ever arrive, with nothing telling the user
   * why), this re-registers the still-valid browser subscription with the backend whenever the two
   * disagree, so a `true` result always actually means "this device will receive pushes."
   *
   * Runs once per session from `AppComponent` as well as on the settings screen, so a device that
   * lost its backend row re-registers itself without anyone having to visit that screen at all.
   *
   * Both requests opt out of the generic error toast and a failure resolves to `false` rather than
   * rejecting: this runs unprompted in the background, where an error toast would be noise the user
   * can't act on, and on the settings screen the device list's own load surfaces the same failure
   * anyway.
   */
  async syncSubscription(): Promise<boolean> {
    if (!this.swPush.isEnabled) {
      return false;
    }
    const subscription = await firstValueFrom(this.swPush.subscription);
    if (!subscription) {
      return false;
    }

    try {
      const {items} = await firstValueFrom(this.pushApiService.getSubscriptions(true));
      const knownToBackend = items.some(item => item.endpoint === subscription.endpoint);
      if (!knownToBackend) {
        await firstValueFrom(this.pushApiService.createSubscription(this.toSubscriptionRequest(subscription), true));
      }
      return true;
    } catch {
      return false;
    }
  }

  async enable(): Promise<void> {
    const {publicKey} = await firstValueFrom(this.pushApiService.getPublicKey());
    const subscription = await this.swPush.requestSubscription({serverPublicKey: publicKey});

    await firstValueFrom(this.pushApiService.createSubscription(this.toSubscriptionRequest(subscription)));
  }

  async disable(): Promise<void> {
    const subscription = await firstValueFrom(this.swPush.subscription);
    if (subscription) {
      const {items} = await firstValueFrom(this.pushApiService.getSubscriptions());
      const match = items.find(item => item.endpoint === subscription.endpoint);
      if (match) {
        await firstValueFrom(this.pushApiService.deleteSubscription(match.id));
      }
      await this.swPush.unsubscribe();
    }
  }

  /**
   * Lists this user's own registered devices, current device sorted first. Note this reflects
   * "who's currently attributed as using this device" (see `PushSubscriptionService.createSubscription`
   * backend-side, which reassigns attribution to whoever's logged in on every (re-)subscribe) -
   * not necessarily every device physically receiving pushes right now.
   */
  async getDevices(): Promise<PushDeviceItem[]> {
    const currentEndpoint = this.swPush.isEnabled
      ? (await firstValueFrom(this.swPush.subscription))?.endpoint
      : undefined;

    const {items} = await firstValueFrom(this.pushApiService.getSubscriptions());
    return items
      .map(item => ({
        id: item.id,
        userAgent: item.userAgent,
        label: item.label,
        createdAt: item.createdAt,
        isCurrentDevice: item.endpoint === currentEndpoint
      }))
      .sort((a, b) => Number(b.isCurrentDevice) - Number(a.isCurrentDevice));
  }

  /**
   * Sets (or, given `null`, clears back to the auto-detected browser/OS label) a custom name for
   * a device, so it can be told apart more easily than by "Chrome unter Windows" alone.
   */
  async renameDevice(deviceId: number, label: string | null): Promise<void> {
    await firstValueFrom(this.pushApiService.updateLabel(deviceId, {label}));
  }

  /**
   * Sends a test notification to one specific device, so "does push actually work here?" can be
   * answered right away instead of by waiting for the next distribution. The backend deliberately
   * answers 200 with an outcome rather than an error status for a failed send - see
   * `PushTestResult` for the cases the caller has to distinguish.
   */
  async sendTestNotification(deviceId: number): Promise<PushTestResult> {
    const {result} = await firstValueFrom(this.pushApiService.sendTestNotification(deviceId));
    return result;
  }

  /**
   * Removes a device from the list. If it's the device this call runs on, this also unsubscribes
   * at the browser level so the toggle reflects the change immediately - for any other device
   * (e.g. an old phone), only the backend record is removed; there's no way to reach into another
   * device's browser from here, but that device's next push attempt gets an EXPIRED/403 response
   * and self-prunes on the backend regardless (see `WebPushSenderService`).
   */
  async removeDevice(device: PushDeviceItem): Promise<void> {
    await firstValueFrom(this.pushApiService.deleteSubscription(device.id));
    if (device.isCurrentDevice) {
      await this.swPush.unsubscribe();
    }
  }

  /**
   * User-level preferences (master switch plus a per-type opt-out), unlike everything above which
   * is scoped to this one device - these apply across every device the user has registered.
   */
  async getPreferences(): Promise<PushPreferencesResponse> {
    return firstValueFrom(this.pushApiService.getPreferences());
  }

  async setMasterEnabled(enabled: boolean): Promise<PushPreferencesResponse> {
    return firstValueFrom(this.pushApiService.updateMasterPreference({enabled}));
  }

  async setTypeEnabled(type: PushNotificationType, enabled: boolean): Promise<PushPreferencesResponse> {
    return firstValueFrom(this.pushApiService.updateTypePreference(type, {enabled}));
  }

  private toSubscriptionRequest(subscription: PushSubscription): PushSubscriptionRequest {
    const json = subscription.toJSON();
    return {
      endpoint: json.endpoint!,
      p256dhKey: json.keys!['p256dh'],
      authKey: json.keys!['auth'],
      userAgent: this.window.navigator.userAgent
    };
  }
}
