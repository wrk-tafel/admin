import {Component, OnInit} from '@angular/core';
import {
  DistributionApiService,
  DistributionItem,
  DistributionStateItem,
  DistributionStatesResponse
} from '../../../../api/distribution-api.service';
import {ActivatedRoute} from '@angular/router';
import {GlobalStateService} from '../../../../common/state/global-state.service';

@Component({
  selector: 'tafel-distribution-state',
  templateUrl: 'distribution-state.component.html'
})
export class DistributionStateComponent implements OnInit {

  constructor(
    private distributionApiService: DistributionApiService,
    private globalStateService: GlobalStateService,
    private activatedRoute: ActivatedRoute
  ) {
  }

  states: DistributionStateItem[] = this.distributionStates.states;
  distribution: DistributionItem;
  showNextDistributionStateModal = false;

  progressMax: number = this.distributionStates.states.length;
  progressCurrent = 0;

  ngOnInit() {
    this.globalStateService.getCurrentDistribution().subscribe((distribution) => {
      this.processDistribution(distribution);
    });
  }

  createNewDistribution() {
    this.distributionApiService.createNewDistribution().subscribe();
  }

  processDistribution(distribution: DistributionItem) {
    this.distribution = distribution;
    if (distribution) {
      const stateIndex = this.states.findIndex((state: DistributionStateItem) => state.name === distribution.state.name);
      this.progressCurrent = stateIndex;
    } else {
      this.progressCurrent = 0;
    }
  }

  switchToNextState() {
    this.distributionApiService.switchToNextState().subscribe(() => {
      this.showNextDistributionStateModal = false;
    });
  }

  get distributionStates(): DistributionStatesResponse {
    return this.activatedRoute.snapshot.data.distributionStates;
  }

}
