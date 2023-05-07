import {Component, OnInit} from '@angular/core';

@Component({
  selector: 'tafel-ticket-screen',
  templateUrl: 'ticket-screen.component.html'
})
export class TicketScreenComponent implements OnInit {

  count: number = 0;

  ngOnInit(): void {
    setInterval(() => {
      this.count = this.count + 1;
    }, 1000);
  }

}
