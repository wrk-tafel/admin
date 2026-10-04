import {inject, Service} from '@angular/core';
import {SwUpdate, VersionReadyEvent} from '@angular/service-worker';
import {ActivatedRouteSnapshot, Router} from '@angular/router';
import {filter, interval} from 'rxjs';
import {TafelToastrService} from '../components/tafel-toastr/tafel-toastr.service';

/**
 * Route `data` key of a screen that nobody operates - the ticket monitor on the display in the hall.
 * Such a screen applies a new version by reloading itself: it holds no input a reload could lose,
 * and there is nobody in front of it to press "Neu laden". See ADR-0065.
 */
export const RELOAD_ON_NEW_VERSION = 'reloadOnNewVersion';

/**
 * How often an open tab asks the server whether a new version exists. The service worker asks on
 * its own only when a page is loaded, which a tab that is left open never does again.
 */
export const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Brings a new version to a tab that is already open. Without this, the tab keeps running the
 * version it was loaded with indefinitely - the new one only takes effect on the *next* full
 * reload, which for a kiosk/tablet screen that's rarely closed could be a long time.
 *
 * Two halves: asking for a new version regularly, so the service worker downloads it in the
 * background, and reacting once it is ready - a prompt on a screen somebody works on, a reload on
 * one marked with {@link RELOAD_ON_NEW_VERSION}.
 */
@Service()
export class SwUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly toastr = inject(TafelToastrService);
  private readonly window = inject(Window);
  private readonly router = inject(Router);

  init() {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    interval(UPDATE_CHECK_INTERVAL_MS).subscribe(() => {
      // Rejects when the server cannot be reached or the worker is in a broken state. Neither is
      // worth more than the next attempt: a tab that is offline has its own, visible problem.
      this.swUpdate.checkForUpdate().catch(() => undefined);
    });

    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        if (this.currentScreenReloadsItself()) {
          this.window.location.reload();
          return;
        }

        // 'success' rather than 'warning': a new version is good news, not something wrong that
        // needs attention - reloading is entirely optional, so the toast shouldn't read as urgent.
        // durationMs 0: stays open until acted on - an auto-dismissed reload prompt is easily
        // missed, which matters most on the long-lived kiosk/tablet screens this exists for (see
        // ADR-0029) - but it can be dismissed via its close button at any time.
        const snackBarRef = this.toastr.success('Eine neue Version ist verfügbar.', undefined, {
          action: 'Neu laden',
          durationMs: 0,
        });
        snackBarRef.onAction().subscribe(() => {
          this.window.location.reload();
        });
      });
  }

  private currentScreenReloadsItself(): boolean {
    let route: ActivatedRouteSnapshot = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.data[RELOAD_ON_NEW_VERSION] === true;
  }
}
