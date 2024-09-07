import {Component, inject, OnInit} from '@angular/core';
import {DistributionApiService, DistributionItem} from '../../../../api/distribution-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';
import {
  ButtonCloseDirective,
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardHeaderComponent,
  ColComponent, ModalBodyComponent,
  ModalComponent, ModalHeaderComponent, ModalToggleDirective,
  RowComponent
} from '@coreui/angular';
import {NgIf} from '@angular/common';

@Component({
  selector: 'tafel-distribution-state',
  templateUrl: 'distribution-state.component.html',
  imports: [
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    RowComponent,
    ColComponent,
    ModalComponent,
    ModalHeaderComponent,
    ModalToggleDirective,
    ModalBodyComponent,
    NgIf,
    ButtonDirective,
    ButtonCloseDirective
  ],
  standalone: true
})
export class DistributionStateComponent implements OnInit {
  distribution: DistributionItem;
  showCloseDistributionModal = false;
  private distributionApiService = inject(DistributionApiService);
  private globalStateService = inject(GlobalStateService);

  ngOnInit() {
    this.globalStateService.getCurrentDistribution().subscribe((distribution) => {
      this.distribution = distribution;
    });
  }

  createNewDistribution() {
    this.distributionApiService.createNewDistribution().subscribe();
  }

  closeDistribution() {
    this.distributionApiService.closeDistribution().subscribe(() => {
      this.showCloseDistributionModal = false;
    });
  }

}
