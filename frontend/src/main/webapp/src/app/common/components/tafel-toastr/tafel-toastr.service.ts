import {Injectable, inject} from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {TafelSnackbarComponent, TafelSnackbarSeverity} from '../tafel-snackbar/tafel-snackbar.component';

const DURATION_MS = 5000;

@Injectable({
  providedIn: 'root',
})
export class TafelToastrService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string, title?: string) {
    this.show('success', message, title);
  }

  error(message: string, title?: string) {
    this.show('error', message, title);
  }

  info(message: string, title?: string) {
    this.show('info', message, title);
  }

  warning(message: string, title?: string) {
    this.show('warning', message, title);
  }

  private show(severity: TafelSnackbarSeverity, message: string, title?: string) {
    this.snackBar.openFromComponent(TafelSnackbarComponent, {
      data: {message, title, severity},
      duration: DURATION_MS,
      panelClass: ['tafel-snackbar-panel', `tafel-snackbar-panel-${severity}`],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}
