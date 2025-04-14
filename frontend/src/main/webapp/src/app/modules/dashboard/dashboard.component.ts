import {Component, inject, Input, OnInit} from '@angular/core';
import {ButtonDirective, ColComponent, RowComponent} from '@coreui/angular';
import {DistributionStateComponent} from './components/distribution-state/distribution-state.component';
import {RegisteredCustomersComponent} from './components/registered-customers/registered-customers.component';
import {TafelIfPermissionDirective} from '../../common/security/tafel-if-permission.directive';
import {
  DistributionStatisticsInputComponent
} from './components/distribution-statistics-input/distribution-statistics-input.component';
import {TafelIfDistributionActiveDirective} from '../../common/directive/tafel-if-distribution-active.directive';
import {
  RecordedFoodCollectionsComponent
} from './components/recorded-food-collections/recorded-food-collections.component';
import {FoodAmountComponent} from './components/food-amount/food-amount.component';
import {ShelterListResponse} from '../../api/shelter-api.service';
import {
  DistributionNotesInputComponent
} from './components/distribution-notes-input/distribution-notes-input.component';
import {TicketsProcessedComponent} from './components/tickets-processed/tickets-processed.component';
import {SseService} from '../../common/sse/sse.service';

@Component({
  selector: 'tafel-dashboard',
  templateUrl: 'dashboard.component.html',
  imports: [
    RowComponent,
    ColComponent,
    DistributionStateComponent,
    RegisteredCustomersComponent,
    TafelIfPermissionDirective,
    ButtonDirective,
    DistributionStatisticsInputComponent,
    TafelIfDistributionActiveDirective,
    RecordedFoodCollectionsComponent,
    FoodAmountComponent,
    DistributionNotesInputComponent,
    TicketsProcessedComponent
  ],
  standalone: true
})
export class DashboardComponent implements OnInit {
  private readonly sseService = inject(SseService);

  @Input() sheltersData: ShelterListResponse;
  data: DashboardData;

  ngOnInit(): void {
    this.sseService.listen('/dashboard/sse').subscribe((data: DashboardData) => {
      this.data = data;
    });
  }

}

export interface DashboardData {
  registeredCustomers?: number;
  tickets?: DashboardTicketsData;
  statistics?: DashboardStatisticsData;
  logistics?: DashboardLogisticsData;
  notes?: string;
}

export interface DashboardTicketsData {
  countProcessedTickets?: number;
  countTotalTickets?: number;
}

export interface DashboardStatisticsData {
  employeeCount?: number;
  selectedShelterNames?: string[];
}

export interface DashboardLogisticsData {
  foodCollectionsRecordedCount?: number;
  foodCollectionsTotalCount?: number;
  foodAmountTotal?: number;
}
