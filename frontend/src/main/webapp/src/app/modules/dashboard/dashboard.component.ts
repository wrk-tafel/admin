import {Component, OnInit} from '@angular/core';
import {DistributionApiService, DistributionItem} from "../../api/distribution-api.service";

@Component({
  selector: 'tafel-dashboard',
  templateUrl: 'dashboard.component.html'
})
export class DashboardComponent implements OnInit {

  constructor(
    private distributionApiService: DistributionApiService
  ) {
  }

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
    });
  }

}
