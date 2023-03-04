import {Component, OnInit, ViewChild} from '@angular/core';
import {DistributionApiService, DistributionItem, DistributionStateItem} from '../../../api/distribution-api.service';
import {ModalDirective} from 'ngx-bootstrap/modal';

@Component({
  selector: 'tafel-distribution-state',
  templateUrl: 'distribution-state.component.html'
})
export class DistributionStateComponent implements OnInit {

  constructor(
    private distributionApiService: DistributionApiService
  ) {
  }

  @ViewChild('stopDistributionModal') stopDistributionModal: ModalDirective;

  states: DistributionStateItem[];
  distribution: DistributionItem;

  progressMax: number;
  progressCurrent: number = 0;

  ngOnInit() {
    this.distributionApiService.getStates().subscribe((response) => {
      const states = response.states;
      this.progressMax = states.length;

      this.states = response.states;
    });

    this.distributionApiService.getCurrentDistribution().subscribe((distribution) => {
      this.distribution = distribution;
    });
  }

  createNewDistribution() {
    this.distributionApiService.createNewDistribution().subscribe((distribution) => {
      this.distribution = distribution;
    });
  }

}
