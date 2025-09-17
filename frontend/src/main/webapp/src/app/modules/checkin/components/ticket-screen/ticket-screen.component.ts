import {Component, inject, OnInit} from '@angular/core';
import {BgColorDirective, ColComponent, ContainerComponent, RowComponent} from '@coreui/angular';
import {SseService} from '../../../../common/sse/sse.service';

@Component({
    selector: 'tafel-ticket-screen',
    templateUrl: 'ticket-screen.component.html',
    imports: [
        ContainerComponent,
        RowComponent,
        ColComponent,
        BgColorDirective,
    ]
})
export class TicketScreenComponent implements OnInit {
  private readonly sseService = inject(SseService);

  text: string;
  value: string;

  ngOnInit(): void {
    this.sseService.listen('/sse/distributions/ticket-screen/current').subscribe((response: TicketScreenText) => {
      this.text = response.text;
      this.value = response.value;
    });
  }

}

export interface TicketScreenText {
  text: string;
  value: string;
}
