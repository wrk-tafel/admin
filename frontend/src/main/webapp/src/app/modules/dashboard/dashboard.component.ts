import {Component, inject, input, Signal} from '@angular/core';
import {ColComponent, RowComponent} from '@coreui/angular';
import {DistributionStateComponent} from './components/distribution-state/distribution-state.component';
import {RegisteredCustomersComponent} from './components/registered-customers/registered-customers.component';
import {TafelIfPermissionDirective} from '../../common/security/tafel-if-permission.directive';
import {
  DistributionStatisticsInputComponent
} from './components/distribution-statistics-input/distribution-statistics-input.component';
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
import {toSignal} from '@angular/core/rxjs-interop';

@Component({
    selector: 'tafel-dashboard',
    templateUrl: 'dashboard.component.html',
    imports: [
        RowComponent,
        ColComponent,
        DistributionStateComponent,
        RegisteredCustomersComponent,
        TafelIfPermissionDirective,
        DistributionStatisticsInputComponent,
        RecordedFoodCollectionsComponent,
        FoodAmountComponent,
        DistributionNotesInputComponent,
        TicketsProcessedComponent
    ]
})
export class DashboardComponent {
  private readonly sseService = inject(SseService);

  // Signal input from resolver - reactive!
  readonly sheltersData = input<ShelterListResponse>();

  readonly data: Signal<DashboardData | undefined> = toSignal(
    this.sseService.listen<DashboardData>('/sse/dashboard')
  );

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
