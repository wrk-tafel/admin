import {Component, inject, OnInit} from '@angular/core';
import {WebsocketService} from '../../common/websocket/websocket.service';
import {IMessage} from '@stomp/stompjs';

@Component({
  selector: 'tafel-dashboard',
  templateUrl: 'dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  data: DashboardData;
  private websocketService = inject(WebsocketService);

  ngOnInit(): void {
    this.websocketService.watch('/topic/dashboard').subscribe((message: IMessage) => {
      const data: DashboardData = JSON.parse(message.body);
      this.data = data;
    });
  }

}

export interface DashboardData {
  registeredCustomers?: number;
}
