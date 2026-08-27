import {inject, Service} from '@angular/core';
import {SwUpdate, VersionReadyEvent} from '@angular/service-worker';
import {filter} from 'rxjs';
import {TafelToastrService} from '../components/tafel-toastr/tafel-toastr.service';

/**
 * Prompts the user to reload once a new version has been downloaded in the background by the
 * service worker. Without this, an already-open tab keeps running the version it was loaded
 * with indefinitely - the new version only takes effect on the *next* full reload, which for a
 * kiosk/tablet screen that's rarely closed could be a long time.
 */
@Service()
export class SwUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly toastr = inject(TafelToastrService);
  private readonly window = inject(Window);

  init() {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
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
}
