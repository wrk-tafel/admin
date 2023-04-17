import {Component, OnInit} from '@angular/core';
import {WebsocketService} from '../../common/websocket/websocket.service';

@Component({
  selector: 'tafel-dashboard',
  templateUrl: 'dashboard.component.html'
})
export class DashboardComponent implements OnInit {

  constructor(
    private websocketService: WebsocketService
  ) {
  }

  data: DashboardData;

  ngOnInit(): void {
    this.websocketService.watch('/topic/dashboard').subscribe((message) => {
      const data: DashboardData = JSON.parse(message.body);
      this.data = data;
    });
  }

}

interface DashboardData {
  registeredCustomers?: number;
}
