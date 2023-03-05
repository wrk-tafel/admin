import {Component, OnInit, ViewChild} from '@angular/core';
import {
  DistributionApiService,
  DistributionItem,
  DistributionStateItem,
  DistributionStatesResponse
} from '../../../api/distribution-api.service';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'tafel-distribution-state',
  templateUrl: 'distribution-state.component.html'
})
export class DistributionStateComponent implements OnInit {

  constructor(
    private distributionApiService: DistributionApiService,
    private activatedRoute: ActivatedRoute
  ) {
  }

  @ViewChild('nextDistributionStateModal') stopDistributionModal: ModalDirective;

  states: DistributionStateItem[] = this.distributionStates.states;

  distribution: DistributionItem;

  progressMax: number = this.distributionStates.states.length;
  progressCurrent: number = 0;

  ngOnInit() {
    this.distributionApiService.getCurrentDistribution().subscribe((distribution) => {
      this.processDistribution(distribution);
    });
  }

  createNewDistribution() {
    this.distributionApiService.createNewDistribution().subscribe((distribution) => {
      this.processDistribution(distribution);
    });
  }

  processDistribution(distribution: DistributionItem) {
    this.distribution = distribution;
    if (distribution) {
      const stateIndex = this.states.findIndex((state: DistributionStateItem) => state.name === distribution.state.name);
      this.progressCurrent = stateIndex;
    }
  }

  switchToNextState() {
    this.distributionApiService.switchToNextState();
  }

  get distributionStates(): DistributionStatesResponse {
    return this.activatedRoute.snapshot.data.distributionStates;
  }

}
