import {Component, OnInit, ViewChild} from '@angular/core';
import {DistributionApiService, DistributionItem} from '../../api/distribution-api.service';
import {ModalDirective} from 'ngx-bootstrap/modal';

@Component({
  selector: 'tafel-dashboard',
  templateUrl: 'dashboard.component.html'
})
export class DashboardComponent implements OnInit {

  constructor(
    private distributionApiService: DistributionApiService
  ) {
  }

  @ViewChild('stopDistributionModal') stopDistributionModal: ModalDirective;

  distribution: DistributionItem;

  ngOnInit(): void {
    this.distributionApiService.getCurrentDistribution().subscribe((distribution) => {
      this.distribution = distribution;
    });
  }

  startDistribution() {
    // TODO handle errors
    this.distributionApiService.startDistribution().subscribe((distribution) => {
      this.distribution = distribution;
    });
  }

  stopDistribution() {
    // TODO handle errors
    // TODO add modal and ask before stopping
    this.distributionApiService.stopDistribution(this.distribution.id).subscribe(() => {
      this.distribution = undefined;
      this.stopDistributionModal.hide();
    });
  }

}
