import {Component, OnInit} from '@angular/core';
import {DistributionApiService, DistributionItem} from '../../../../api/distribution-api.service';
import {GlobalStateService} from '../../../../common/state/global-state.service';

@Component({
  selector: 'tafel-distribution-state',
  templateUrl: 'distribution-state.component.html'
})
export class DistributionStateComponent implements OnInit {

  constructor(
    private distributionApiService: DistributionApiService,
    private globalStateService: GlobalStateService
  ) {
  }

  distribution: DistributionItem;
  showCloseDistributionModal = false;

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
