import {Component, inject, OnInit} from '@angular/core';
import {WebsocketService} from '../../common/websocket/websocket.service';
import {IMessage} from '@stomp/stompjs';
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
import {TafelIfDistributionActiveDirective} from '../../common/directive/tafel-if-distribution-active.directive';

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
    TafelIfDistributionActiveDirective
  ]
})
export class DashboardComponent implements OnInit {
  data: DashboardData;

  private readonly websocketService = inject(WebsocketService);

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
  personsInShelterCount?: number;
}

export interface DashboardLogisticsData {
  foodCollectionsRecordedCount?: number;
  foodCollectionsTotalCount?: number;
  foodAmountTotal?: number;
}
