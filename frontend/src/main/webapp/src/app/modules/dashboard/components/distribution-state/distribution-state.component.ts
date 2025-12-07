import {Component, inject, OnInit} from '@angular/core';
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
  ],
  standalone: true
})
export class DistributionStateComponent implements OnInit {
  distribution: DistributionItem;
  showCloseDistributionModal = false;
  showCloseDistributionValidationModal = false;
  closeDistributionValidationResult: DistributionCloseValidationResult;

  private readonly distributionApiService = inject(DistributionApiService);
  private readonly globalStateService = inject(GlobalStateService);

  ngOnInit() {
    this.globalStateService.getCurrentDistribution().subscribe((distribution) => {
      this.distribution = distribution;
    });
  }

  createNewDistribution() {
    this.distributionApiService.createNewDistribution().subscribe();
  }

  closeDistribution(forceClose: boolean) {
    const observer = {
      next: (result: DistributionCloseValidationResult) => {
        this.closeDistributionValidationResult = result;
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

  getCloseValidationResultBgColorClass(): Colors {
    if (this.closeDistributionValidationResult.errors.length > 0) {
      return 'danger';
    } else if (this.closeDistributionValidationResult.warnings.length > 0) {
      return 'warning';
    }
    return null;
  }

  getCloseValidationResultTitle(): string {
    if (this.closeDistributionValidationResult.errors.length > 0) {
      return 'Fehler';
    } else if (this.closeDistributionValidationResult.warnings.length > 0) {
      return 'Hinweis';
    }
    return null;
  }

}
