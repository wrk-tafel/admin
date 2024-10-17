import {Component, inject, OnInit} from '@angular/core';
import {WebsocketService} from '../../common/websocket/websocket.service';
import {IMessage} from '@stomp/stompjs';
import {ButtonDirective, ColComponent, RowComponent} from '@coreui/angular';
import {DistributionStateComponent} from './components/distribution-state/distribution-state.component';
import {RegisteredCustomersComponent} from './components/registered-customers/registered-customers.component';
import {TafelIfPermissionDirective} from '../../common/security/tafel-if-permission.directive';
import {ToastService, ToastType} from "../../common/views/default-layout/toasts/toast.service";

@Component({
  selector: 'tafel-dashboard',
  templateUrl: 'dashboard.component.html',
  imports: [
    RowComponent,
    ColComponent,
    DistributionStateComponent,
    RegisteredCustomersComponent,
    TafelIfPermissionDirective,
    ButtonDirective
  ],
  standalone: true
})
export class DashboardComponent implements OnInit {
  data: DashboardData;
  private readonly websocketService = inject(WebsocketService);
  private readonly toastService = inject(ToastService);

  ngOnInit(): void {
    this.websocketService.watch('/topic/dashboard').subscribe((message: IMessage) => {
      this.data = JSON.parse(message.body);
    });
  }

  showToast() {
    this.toastService.showToast({type: ToastType.SUCCESS, title: 'Kunde wurde gelöscht!'});
  }
}

export interface DashboardData {
  registeredCustomers?: number;
}
