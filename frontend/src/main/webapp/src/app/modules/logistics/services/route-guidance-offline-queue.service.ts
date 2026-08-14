import {computed, effect, inject, Service, signal} from '@angular/core';
import {Subject} from 'rxjs';
import {RouteApiService, RouteGuidanceStop} from '../../../api/route-api.service';
import {ConnectivityService} from '../../../common/connectivity/connectivity.service';

const STORAGE_KEY = 'tafel.routeGuidanceOfflineQueue';

interface QueuedCompletion {
  routeId: number;
  stopId: number;
  completed: boolean;
}

function keyOf(item: Pick<QueuedCompletion, 'routeId' | 'stopId'>): string {
  return `${item.routeId}:${item.stopId}`;
}

/**
 * Persists route guidance completion ticks that couldn't be sent immediately - the driver taps
 * "Stopp erledigt" from a loading dock with no signal - so they survive a reload/app close, and
 * flushes them automatically once back online. Mirrors `FoodCollectionOfflineQueueService`'s
 * localStorage-backed queue/flush shape; kept as a separate service rather than a shared one
 * because the two work on structurally different payloads (an absolute item amount per
 * route/shop/category vs. a completion flag per route/stop) and against different endpoints.
 *
 * Only the latest `completed` flag per (routeId, stopId) is kept - a driver flipping a stop back
 * and forth while offline only cares about where it ends up, and the last tap already overwrites
 * anything queued before it.
 */
@Service()
export class RouteGuidanceOfflineQueueService {
  private readonly routeApiService = inject(RouteApiService);
  private readonly connectivityService = inject(ConnectivityService);
  private readonly window = inject(Window);

  private readonly queue = signal<Record<string, QueuedCompletion>>(this.loadFromStorage());
  private flushInFlight = false;

  readonly pendingCount = computed(() => Object.keys(this.queue()).length);

  // Emits the authoritative stop (with the server-assigned completedAt/completedBy) once a queued
  // completion is actually sent, so a component holding its own in-memory guidance can merge the
  // real answer in instead of only ever showing the optimistic local guess.
  private readonly _stopSynced = new Subject<{routeId: number; stop: RouteGuidanceStop}>();
  readonly stopSynced$ = this._stopSynced.asObservable();

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

  enqueue(routeId: number, stopId: number, completed: boolean) {
    const item: QueuedCompletion = {routeId, stopId, completed};
    this.queue.update(current => ({...current, [keyOf(item)]: item}));
    this.persist();
    this.flush();
  }

  /** Whether a not-yet-sent completion is queued for this stop. */
  isPending(routeId: number, stopId: number): boolean {
    return !!this.queue()[keyOf({routeId, stopId})];
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
    this.routeApiService.setStopCompletion(next.routeId, next.stopId, next.completed).subscribe({
      next: updatedStop => {
        this.removeIfUnchanged(next);
        this._stopSynced.next({routeId: next.routeId, stop: updatedStop});
        this.flushInFlight = false;
        this.flush();
      },
      error: () => {
        // Leave it queued - the next connectivity/focus/enqueue trigger retries. A transient
        // network failure and a real backend rejection look the same from here; retrying a
        // rejected write forever is preferable to silently dropping a driver's tick.
        this.flushInFlight = false;
      }
    });
  }

  // Only removes the entry if it still holds the value that was just sent - if a newer enqueue()
  // overwrote it while this send was in flight, that value hasn't been sent yet and must stay
  // queued for the next flush() to pick up, instead of being silently discarded.
  private removeIfUnchanged(sent: QueuedCompletion) {
    const key = keyOf(sent);
    this.queue.update(current => {
      if (current[key]?.completed !== sent.completed) {
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

  private loadFromStorage(): Record<string, QueuedCompletion> {
    try {
      const raw = this.window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
}
