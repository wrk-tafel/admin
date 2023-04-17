import {Component, OnInit, ViewChild} from '@angular/core';
import {
  DistributionApiService,
  DistributionItem,
  DistributionStateItem,
  DistributionStatesResponse
} from '../../../../api/distribution-api.service';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {ActivatedRoute} from '@angular/router';
import {GlobalStateService} from '../../../../common/state/global-state.service';

@Component({
  selector: 'tafel-distribution-state',
  templateUrl: 'distribution-state.component.html',
  styleUrls: ['../../dashboard.component.css']
})
export class DistributionStateComponent implements OnInit {

  constructor(
    private distributionApiService: DistributionApiService,
    private globalStateService: GlobalStateService,
    private activatedRoute: ActivatedRoute
  ) {
  }

  @ViewChild('nextDistributionStateModal') nextDistributionStateModal: ModalDirective;

  states: DistributionStateItem[] = this.distributionStates.states;

  distribution: DistributionItem;

  progressMax: number = this.distributionStates.states.length;
  progressCurrent: number = 0;

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
      this.nextDistributionStateModal.hide();
    });
  }

  get distributionStates(): DistributionStatesResponse {
    return this.activatedRoute.snapshot.data.distributionStates;
  }

}
