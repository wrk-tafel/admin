import {Injectable, inject} from '@angular/core';
import {MatSnackBar, MatSnackBarRef} from '@angular/material/snack-bar';
import {TafelSnackbarComponent, TafelSnackbarSeverity} from '../tafel-snackbar/tafel-snackbar.component';

const DURATION_MS = 5000;

export interface TafelToastrOptions {
  /** renders an action button inside the toast; subscribe to the returned ref's onAction() */
  action?: string;
  /** overrides the default auto-dismiss; 0 keeps the toast open until dismissed */
  durationMs?: number;
}

@Injectable({
  providedIn: 'root',
})
export class TafelToastrService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string, title?: string, options?: TafelToastrOptions): MatSnackBarRef<TafelSnackbarComponent> {
    return this.show('success', message, title, options);
  }

  error(message: string, title?: string, options?: TafelToastrOptions): MatSnackBarRef<TafelSnackbarComponent> {
    return this.show('error', message, title, options);
  }

  warning(message: string, title?: string, options?: TafelToastrOptions): MatSnackBarRef<TafelSnackbarComponent> {
    return this.show('warning', message, title, options);
  }

  private show(severity: TafelSnackbarSeverity, message: string, title?: string, options?: TafelToastrOptions) {
    return this.snackBar.openFromComponent(TafelSnackbarComponent, {
      data: {message, title, severity, action: options?.action},
      duration: options?.durationMs ?? DURATION_MS,
      panelClass: ['tafel-snackbar-panel', `tafel-snackbar-panel-${severity}`],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}
