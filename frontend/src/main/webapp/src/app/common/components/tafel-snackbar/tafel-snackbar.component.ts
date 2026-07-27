import {Component, inject} from '@angular/core';
import {MAT_SNACK_BAR_DATA, MatSnackBarRef} from '@angular/material/snack-bar';
import {MatIconButton} from '@angular/material/button';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faCircleCheck, faCircleExclamation, faCircleInfo, faTriangleExclamation, faXmark} from '@fortawesome/free-solid-svg-icons';

export type TafelSnackbarSeverity = 'success' | 'error' | 'info' | 'warning';

export interface TafelSnackbarData {
  message: string;
  title?: string;
  severity: TafelSnackbarSeverity;
}

const SEVERITY_ICONS = {
  success: faCircleCheck,
  error: faCircleExclamation,
  info: faCircleInfo,
  warning: faTriangleExclamation,
};

@Component({
  selector: 'tafel-snackbar',
  templateUrl: 'tafel-snackbar.component.html',
  styleUrls: ['tafel-snackbar.component.scss'],
  imports: [FaIconComponent, MatIconButton],
})
export class TafelSnackbarComponent {
  readonly data: TafelSnackbarData = inject(MAT_SNACK_BAR_DATA);
  private readonly snackBarRef = inject(MatSnackBarRef<TafelSnackbarComponent>);

  protected readonly icon = SEVERITY_ICONS[this.data.severity];
  protected readonly faXmark = faXmark;

  dismiss() {
    this.snackBarRef.dismiss();
  }
}
