import {Component, inject, OnInit} from '@angular/core';
import {WebsocketService} from '../../common/websocket/websocket.service';
import {IMessage} from '@stomp/stompjs';
import {ColComponent, RowComponent} from '@coreui/angular';
import {DistributionStateComponent} from './components/distribution-state/distribution-state.component';
import {RegisteredCustomersComponent} from './components/registered-customers/registered-customers.component';
import {TafelIfPermissionDirective} from '../../common/security/tafel-if-permission.directive';

@Component({
  selector: 'tafel-dashboard',
  templateUrl: 'dashboard.component.html',
  standalone: true,
  imports: [
    RowComponent,
    ColComponent,
    DistributionStateComponent,
    RegisteredCustomersComponent,
    TafelIfPermissionDirective,
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
}
