import {computed, effect, inject, Service, signal} from '@angular/core';
import {FoodCollectionItem, FoodCollectionsApiService} from '../../../api/food-collections-api.service';
import {ConnectivityService} from '../../../common/connectivity/connectivity.service';

const STORAGE_KEY = 'tafel.foodCollectionOfflineQueue';

interface QueuedItem {
  routeId: number;
  shopId: number;
  categoryId: number;
  amount: number;
}

function keyOf(item: Pick<QueuedItem, 'routeId' | 'shopId' | 'categoryId'>): string {
  return `${item.routeId}:${item.shopId}:${item.categoryId}`;
}

/**
 * Persists Warenerfassung item updates that couldn't be sent immediately - the codriver recording
 * a route on their phone can lose connectivity on the road - so they survive a reload/app close,
 * and flushes them automatically once back online. Only the latest amount per
 * (routeId, shopId, categoryId) is kept: each save already sets an absolute amount rather than an
 * increment, so anything but the latest value would just be overwritten anyway.
 */
@Service()
export class FoodCollectionOfflineQueueService {
  private readonly foodCollectionsApiService = inject(FoodCollectionsApiService);
  private readonly connectivityService = inject(ConnectivityService);
  private readonly window = inject(Window);

  private readonly queue = signal<Record<string, QueuedItem>>(this.loadFromStorage());
  private flushInFlight = false;

  readonly pendingCount = computed(() => Object.keys(this.queue()).length);

  constructor() {
    // Retry whenever connectivity comes back, and also on window focus - a backgrounded tab that
    // regains connectivity while backgrounded doesn't reliably fire the 'online' event on resume.
    effect(() => {
      if (this.connectivityService.isOnline()()) {
        this.flush();
      }
    });
    this.window.addEventListener('focus', () => this.flush());
  }

  enqueue(routeId: number, shopId: number, categoryId: number, amount: number) {
    const item: QueuedItem = {routeId, shopId, categoryId, amount};
    this.queue.update(current => ({...current, [keyOf(item)]: item}));
    this.persist();
    this.flush();
  }

  /** Pending (not yet sent) amount for a single item, if one is queued. */
  getPendingAmount(routeId: number, shopId: number, categoryId: number): number | undefined {
    return this.queue()[keyOf({routeId, shopId, categoryId})]?.amount;
  }

  /** All pending (not yet sent) items for a shop, e.g. to merge into a freshly loaded/cached view. */
  getPendingForShop(routeId: number, shopId: number): FoodCollectionItem[] {
    return Object.values(this.queue())
      .filter(item => item.routeId === routeId && item.shopId === shopId)
      .map(({categoryId, shopId: itemShopId, amount}) => ({categoryId, shopId: itemShopId, amount}));
  }

  private flush() {
    if (this.flushInFlight || !this.connectivityService.isOnline()()) {
      return;
    }

    const next = Object.values(this.queue())[0];
    if (!next) {
      return;
    }

    this.flushInFlight = true;
    const data: FoodCollectionItem = {categoryId: next.categoryId, shopId: next.shopId, amount: next.amount};
    this.foodCollectionsApiService.patchItems(next.routeId, data).subscribe({
      next: () => {
        this.removeIfUnchanged(next);
        this.flushInFlight = false;
        this.flush();
      },
      error: () => {
        // Leave it queued - the next connectivity/focus/enqueue trigger retries. A transient
        // network failure and a real backend rejection look the same from here; retrying a
        // rejected write forever is preferable to silently dropping a codriver's input.
        this.flushInFlight = false;
      }
    });
  }

  // Only removes the entry if it still holds the value that was just sent - if a newer enqueue()
  // overwrote it while this send was in flight, that value hasn't been sent yet and must stay
  // queued for the next flush() to pick up, instead of being silently discarded.
  private removeIfUnchanged(sent: QueuedItem) {
    this.queue.update(current => {
      const key = keyOf(sent);
      if (current[key]?.amount !== sent.amount) {
        return current;
      }
      const updated = {...current};
      delete updated[key];
      return updated;
    });
    this.persist();
  }

  private persist() {
    try {
      this.window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue()));
    } catch {
      // localStorage can throw (quota, private browsing) - the in-memory queue still works for
      // this session, it just won't survive a reload.
    }
  }

  private loadFromStorage(): Record<string, QueuedItem> {
    try {
      const raw = this.window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
}
