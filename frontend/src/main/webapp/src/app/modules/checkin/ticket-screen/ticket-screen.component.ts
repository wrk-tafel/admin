import {Component, inject, OnInit} from '@angular/core';
import {WebsocketService} from '../../../common/websocket/websocket.service';
import {IMessage} from '@stomp/stompjs';

@Component({
  selector: 'tafel-ticket-screen',
  templateUrl: 'ticket-screen.component.html'
})
export class TicketScreenComponent implements OnInit {
  startTime: Date;
  ticketNumber: number;
  private websocketService = inject(WebsocketService);

  ngOnInit(): void {
    this.websocketService.connect();
    this.websocketService.watch('/topic/ticket-screen').subscribe((message: IMessage) => {
      this.processMessage(message);
    });
  }

  processMessage(message: IMessage) {
    const screenMessage: TicketScreenMessage = JSON.parse(message.body);

    this.startTime = screenMessage.startTime;
    this.ticketNumber = screenMessage.ticketNumber;
  }

}

export interface TicketScreenMessage {
  startTime?: Date;
  ticketNumber?: number;
}
