import {Component, OnInit} from '@angular/core';
import {WebsocketService} from '../../../common/websocket/websocket.service';

@Component({
  selector: 'tafel-ticket-screen',
  templateUrl: 'ticket-screen.component.html'
})
export class TicketScreenComponent implements OnInit {

  constructor(
    private websocketService: WebsocketService
  ) {
  }

  startTime;
  ticketNumber: number = 1;

  ngOnInit(): void {
    this.websocketService.connect();
    this.websocketService.watch('/topic/ticket-screen').subscribe(message => {
      const screenMessage: TicketScreenMessage = JSON.parse(message.body);

      this.startTime = screenMessage.startTime;
      this.ticketNumber = screenMessage.ticketNumber;
    });
  }

}

export interface TicketScreenMessage {
  startTime?: Date;
  ticketNumber?: number;
}
