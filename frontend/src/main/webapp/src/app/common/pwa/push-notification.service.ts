import {inject, Service} from '@angular/core';
import {SwPush} from '@angular/service-worker';
import {firstValueFrom} from 'rxjs';
import {PushApiService} from '../../api/push-api.service';

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

  async isEnabled(): Promise<boolean> {
    if (!this.swPush.isEnabled) {
      return false;
    }
    const subscription = await firstValueFrom(this.swPush.subscription);
    return subscription !== null;
  }

  async enable(): Promise<void> {
    const {publicKey} = await firstValueFrom(this.pushApiService.getPublicKey());
    const subscription = await this.swPush.requestSubscription({serverPublicKey: publicKey});
    const json = subscription.toJSON();

    await firstValueFrom(this.pushApiService.createSubscription({
      endpoint: json.endpoint!,
      p256dhKey: json.keys!['p256dh'],
      authKey: json.keys!['auth']
    }));
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
