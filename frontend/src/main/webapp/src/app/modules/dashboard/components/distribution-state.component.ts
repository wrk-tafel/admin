import {Component, OnInit, ViewChild} from '@angular/core';
import {DistributionApiService, DistributionItem} from '../../../api/distribution-api.service';
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

  distribution: DistributionItem;

  ngOnInit() {
    this.distributionApiService.getCurrentDistribution().subscribe((distribution) => {
      this.distribution = distribution;
    });
  }

  startDistribution() {
    this.distributionApiService.startDistribution().subscribe((distribution) => {
      this.distribution = distribution;
    });
  }

  stopDistribution() {
    this.distributionApiService.stopDistribution(this.distribution.id).subscribe(() => {
      this.distribution = undefined;
      this.stopDistributionModal.hide();
    });
  }

}
