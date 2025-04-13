import {Component, inject, OnInit} from '@angular/core';
import {BgColorDirective, ColComponent, ContainerComponent, RowComponent} from '@coreui/angular';
import {DatePipe, NgIf} from '@angular/common';
import {SseService} from '../../../../common/sse/sse.service';

@Component({
  selector: 'tafel-ticket-screen',
  templateUrl: 'ticket-screen.component.html',
  imports: [
    ContainerComponent,
    RowComponent,
    ColComponent,
    DatePipe,
    BgColorDirective,
    NgIf
  ],
  standalone: true
})
export class TicketScreenComponent implements OnInit {
  private readonly sseService = inject(SseService);

  text: string;
  value: string;

  ngOnInit(): void {
    this.sseService.listen('/distributions/ticket-screen/current').subscribe((response: TicketScreenText) => {
      this.text = response.text;
      this.value = response.value;
    });
  }

}

export interface TicketScreenText {
  text: string;
  value: string;
}
