import {Component, inject, Input, OnInit} from '@angular/core';
import {WebsocketService} from '../../common/websocket/websocket.service';
import {IMessage} from '@stomp/stompjs';
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
    FoodAmountComponent
  ],
  standalone: true
})
export class DashboardComponent implements OnInit {
  private readonly websocketService = inject(WebsocketService);

  @Input() sheltersData: ShelterListResponse;
  data: DashboardData;

  ngOnInit(): void {
    this.websocketService.watch('/topic/dashboard').subscribe((message: IMessage) => {
      this.data = JSON.parse(message.body);
    });
  }

}

export interface DashboardData {
  registeredCustomers?: number;
  statistics?: DashboardStatisticsData;
  logistics?: DashboardLogisticsData;
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
