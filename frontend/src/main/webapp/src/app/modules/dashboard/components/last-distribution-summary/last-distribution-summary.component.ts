import {Component, input} from '@angular/core';
import {MatCard, MatCardContent} from '@angular/material/card';
import {DatePipe, DecimalPipe} from '@angular/common';
import {DashboardLastDistributionData} from '../../dashboard.component';

@Component({
  selector: 'tafel-last-distribution-summary',
  templateUrl: 'last-distribution-summary.component.html',
  imports: [
    MatCard,
    MatCardContent,
    DatePipe,
    DecimalPipe,
  ]
})
export class LastDistributionSummaryComponent {
  summary = input<DashboardLastDistributionData | null>(null);
}
