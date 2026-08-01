import {Injectable, inject} from '@angular/core';
import {SwUpdate, VersionReadyEvent} from '@angular/service-worker';
import {MatSnackBar} from '@angular/material/snack-bar';
import {filter} from 'rxjs';

/**
 * Prompts the user to reload once a new version has been downloaded in the background by the
 * service worker. Without this, an already-open tab keeps running the version it was loaded
 * with indefinitely - the new version only takes effect on the *next* full reload, which for a
 * kiosk/tablet screen that's rarely closed could be a long time.
 */
@Injectable({
  providedIn: 'root',
})
export class SwUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly snackBar = inject(MatSnackBar);
  private readonly window = inject(Window);

  init() {
    if (!this.swUpdate.isEnabled) {
      return;
    }

    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        const snackBarRef = this.snackBar.open('Eine neue Version ist verfügbar.', 'Neu laden', {
          horizontalPosition: 'right',
          verticalPosition: 'top',
        });
        snackBarRef.onAction().subscribe(() => {
          this.window.location.reload();
        });
      });
  }
}
