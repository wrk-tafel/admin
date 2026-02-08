import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {
  DistributionApiService,
  DistributionCloseValidationResult,
  DistributionItem
} from '../../../../api/distribution-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {Subscription} from 'rxjs';
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
import {NgIf} from '@angular/common';

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
        NgIf,
        ButtonDirective,
        ButtonCloseDirective,
        CardFooterComponent,
        BgColorDirective
    ]
})
export class DistributionStateComponent implements OnInit, OnDestroy {
  distribution: DistributionItem;
  showCloseDistributionModal = false;
  showCloseDistributionValidationModal = false;
  closeDistributionValidationResult = signal<DistributionCloseValidationResult>(null);

  private readonly distributionApiService = inject(DistributionApiService);
  private readonly globalStateService = inject(GlobalStateService);
  private distributionSubscription: Subscription;

  closeValidationResultBgColorClass = computed<Colors>(() => {
    const result = this.closeDistributionValidationResult();
    if (!result) return null;

    if (result.errors.length > 0) {
      return 'danger';
    } else if (result.warnings.length > 0) {
      return 'warning';
    }
    return null;
  });

  closeValidationResultTitle = computed<string>(() => {
    const result = this.closeDistributionValidationResult();
    if (!result) return null;

    if (result.errors.length > 0) {
      return 'Fehler';
    } else if (result.warnings.length > 0) {
      return 'Hinweis';
    }
    return null;
  });

  ngOnInit() {
    this.distributionSubscription = this.globalStateService.getCurrentDistribution().subscribe((distribution) => {
      this.distribution = distribution;
    });
  }

  ngOnDestroy(): void {
    if (this.distributionSubscription) {
      this.distributionSubscription.unsubscribe();
    }
  }

  createNewDistribution() {
    this.distributionApiService.createNewDistribution().subscribe();
  }

  closeDistribution(forceClose: boolean) {
    const observer = {
      next: (result: DistributionCloseValidationResult) => {
        this.closeDistributionValidationResult.set(result);
        this.showCloseDistributionModal = false;

        if (result && (result.errors.length > 0 || result.warnings.length > 0)) {
          this.showCloseDistributionValidationModal = true;
        }
      },
      error: error => {
      },
    };
    this.distributionApiService.closeDistribution(forceClose).subscribe(observer);
  }

}
