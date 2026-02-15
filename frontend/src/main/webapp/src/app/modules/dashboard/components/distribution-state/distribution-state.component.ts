import {Component, computed, inject, Signal, signal, viewChild} from '@angular/core';
import {
  DistributionApiService,
  DistributionCloseValidationResult,
  DistributionItem
} from '../../../../api/distribution-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {
  BgColorDirective,
  ButtonCloseDirective,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  ColComponent,
  Colors,
  ModalBodyComponent,
  ModalComponent,
  ModalHeaderComponent,
  ModalToggleDirective,
  RowComponent
} from '@coreui/angular';

@Component({
  selector: 'tafel-distribution-state',
  templateUrl: 'distribution-state.component.html',
  imports: [
    CardComponent,
    CardBodyComponent,
    RowComponent,
    ColComponent,
    ModalComponent,
    ModalHeaderComponent,
    ModalToggleDirective,
    ModalBodyComponent,
    ButtonDirective,
    ButtonCloseDirective,
    CardFooterComponent,
    BgColorDirective
  ]
})
export class DistributionStateComponent {
  closeDistributionValidationModal = viewChild<ModalComponent>('closeDistributionValidationModal');

  showCloseDistributionModal = signal<boolean>(false);
  showCloseDistributionValidationModal = signal<boolean>(false);
  closeDistributionValidationResult = signal<DistributionCloseValidationResult>(null);
  private shouldClearValidationResult = false;

  private readonly distributionApiService = inject(DistributionApiService);
  private readonly globalStateService = inject(GlobalStateService);

  readonly distribution: Signal<DistributionItem> = this.globalStateService.getCurrentDistribution();
  readonly isDistributionActive = computed(() => {
    const dist = this.distribution();
    return dist && !dist.endedAt;
  });

  closeValidationResultBgColorClass = computed<Colors>(() => {
    const result = this.closeDistributionValidationResult();
    if (!result) {
      return null;
    }

    if (result.errors.length > 0) {
      return 'danger';
    } else if (result.warnings.length > 0) {
      return 'warning';
    }
    return null;
  });

  closeValidationResultTitle = computed<string>(() => {
    const result = this.closeDistributionValidationResult();
    if (!result) {
      return null;
    }

    if (result.errors.length > 0) {
      return 'Fehler';
    } else if (result.warnings.length > 0) {
      return 'Hinweis';
    }
    return null;
  });

  createNewDistribution() {
    this.distributionApiService.createNewDistribution().subscribe();
  }

  closeDistribution(forceClose: boolean) {
    const observer = {
      next: (result: DistributionCloseValidationResult) => {
        this.showCloseDistributionModal.set(false);

        if (result && (result.errors.length > 0 || result.warnings.length > 0)) {
          this.shouldClearValidationResult = false;
          this.closeDistributionValidationResult.set(result);
          this.showCloseDistributionValidationModal.set(true);
        } else {
          // Close successful - hide modal and mark for cleanup
          this.shouldClearValidationResult = true;
          this.showCloseDistributionValidationModal.set(false);
        }
      },
      error: error => {
      },
    };
    this.distributionApiService.closeDistribution(forceClose).subscribe(observer);
  }

  onValidationModalVisibilityChange(visible: boolean) {
    this.showCloseDistributionValidationModal.set(visible);

    // If modal is now hidden and we should clear the result, do it now
    if (!visible && this.shouldClearValidationResult) {
      this.closeDistributionValidationResult.set(null);
      this.shouldClearValidationResult = false;
    }
  }

}
