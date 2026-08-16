import {Component, inject} from '@angular/core';
import {MAT_SNACK_BAR_DATA, MatSnackBarRef} from '@angular/material/snack-bar';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {registerSvgIcons} from '../../util/svg-icon.util';
import checkCircleIcon from '@material-symbols/svg-400/outlined/check_circle-fill.svg';
import errorIcon from '@material-symbols/svg-400/outlined/error-fill.svg';
import warningIcon from '@material-symbols/svg-400/outlined/warning-fill.svg';
import closeIcon from '@material-symbols/svg-400/outlined/close-fill.svg';

// deliberately only the three traffic-light states - every toast in the app is one of these
export type TafelSnackbarSeverity = 'success' | 'error' | 'warning';

export interface TafelSnackbarData {
  message: string;
  title?: string;
  severity: TafelSnackbarSeverity;
  action?: string;
}

const SEVERITY_ICONS: Record<TafelSnackbarSeverity, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
};

@Component({
  selector: 'tafel-snackbar',
  templateUrl: 'tafel-snackbar.component.html',
  styleUrls: ['tafel-snackbar.component.scss'],
  imports: [MatIcon, MatButton, MatIconButton],
})
export class TafelSnackbarComponent {
  private readonly registerIcons = registerSvgIcons({
    check_circle: checkCircleIcon,
    error: errorIcon,
    warning: warningIcon,
    close: closeIcon
  });

  readonly data: TafelSnackbarData = inject(MAT_SNACK_BAR_DATA);
  private readonly snackBarRef = inject(MatSnackBarRef<TafelSnackbarComponent>);

  protected readonly icon = SEVERITY_ICONS[this.data.severity];

  dismiss() {
    this.snackBarRef.dismiss();
  }

  dismissWithAction() {
    this.snackBarRef.dismissWithAction();
  }
}
