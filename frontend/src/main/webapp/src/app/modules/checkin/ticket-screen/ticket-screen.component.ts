import {Component, Inject, LOCALE_ID, OnInit} from '@angular/core';
import {WebsocketService} from '../../../common/websocket/websocket.service';

@Component({
  selector: 'tafel-ticket-screen',
  templateUrl: 'ticket-screen.component.html'
})
export class TicketScreenComponent implements OnInit {

  constructor(
    private websocketService: WebsocketService,
    @Inject(LOCALE_ID) public locale: string
  ) {
  }

  startTime: Date;
  ticketNumber: number = 111;

  ngOnInit(): void {
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
