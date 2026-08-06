import {inject, Service} from '@angular/core';
import {SwPush} from '@angular/service-worker';
import {firstValueFrom} from 'rxjs';
import {PushApiService, PushSubscriptionRequest} from '../../api/push-api.service';

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

  isSupported(): boolean {
    return this.swPush.isEnabled;
  }

  /**
   * The browser's own PushManager subscription and the backend's `push_subscriptions` row for it
   * can drift apart independently of the user ever touching the toggle - e.g. the backend's table
   * gets wiped (a dev/test data reset) while the browser still holds a perfectly live
   * subscription. Rather than surface that as a silently-broken "on" toggle (no notifications
   * ever arrive, with nothing telling the user why), this re-registers the still-valid browser
   * subscription with the backend whenever the two disagree, so `isEnabled()` returning `true`
   * always actually means "this device will receive pushes."
   */
  async isEnabled(): Promise<boolean> {
    if (!this.swPush.isEnabled) {
      return false;
    }
    const subscription = await firstValueFrom(this.swPush.subscription);
    if (!subscription) {
      return false;
    }

    const {items} = await firstValueFrom(this.pushApiService.getSubscriptions());
    const knownToBackend = items.some(item => item.endpoint === subscription.endpoint);
    if (!knownToBackend) {
      await firstValueFrom(this.pushApiService.createSubscription(toSubscriptionRequest(subscription)));
    }

    return true;
  }

  async enable(): Promise<void> {
    const {publicKey} = await firstValueFrom(this.pushApiService.getPublicKey());
    const subscription = await this.swPush.requestSubscription({serverPublicKey: publicKey});

    await firstValueFrom(this.pushApiService.createSubscription(toSubscriptionRequest(subscription)));
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
}

function toSubscriptionRequest(subscription: PushSubscription): PushSubscriptionRequest {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint!,
    p256dhKey: json.keys!['p256dh'],
    authKey: json.keys!['auth']
  };
}
