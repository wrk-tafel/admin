import {Component, computed, inject, Signal} from '@angular/core';
import {
  DistributionApiService,
  DistributionCloseValidationResult,
  DistributionItem
} from '../../../../api/distribution-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {MatCard, MatCardContent, MatCardFooter, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatButton} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {CloseDistributionDialogComponent} from './dialogs/close-distribution-dialog.component';
import {CloseDistributionValidationDialogComponent} from './dialogs/close-distribution-validation-dialog.component';

@Component({
  selector: 'tafel-distribution-state',
  templateUrl: 'distribution-state.component.html',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatCardFooter,
    MatButton
  ]
})
export class DistributionStateComponent {
  private readonly distributionApiService = inject(DistributionApiService);
  private readonly globalStateService = inject(GlobalStateService);
  private readonly dialog = inject(MatDialog);

  readonly distribution: Signal<DistributionItem> = this.globalStateService.getCurrentDistribution();
  readonly isDistributionActive = computed(() => {
    const dist = this.distribution();
    return dist && !dist.endedAt;
  });

  createNewDistribution() {
    this.distributionApiService.createNewDistribution().subscribe();
  }

  openCloseDistributionDialog() {
    this.dialog.open(CloseDistributionDialogComponent).afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.closeDistribution(false);
      }
    });
  }

  closeDistribution(forceClose: boolean) {
    this.distributionApiService.closeDistribution(forceClose).subscribe({
      next: (result: DistributionCloseValidationResult) => {
        if (result && (result.errors.length > 0 || result.warnings.length > 0)) {
          this.dialog.open(CloseDistributionValidationDialogComponent, {
            data: {validationResult: result}
          }).afterClosed().subscribe(action => {
            if (action === 'force') {
              this.closeDistribution(true);
            }
          });
        }
      },
    });
  }
}