import {Component, ComponentRef, ViewChild, ViewContainerRef} from '@angular/core';
import {TicketScreenWindowComponent} from '../ticket-screen-window/ticket-screen-window.component';

@Component({
  selector: 'tafel-ticket-screen-control',
  templateUrl: 'ticket-screen-control.component.html'
})
export class TicketScreenControlComponent {

  @ViewChild('windowContainer', {read: ViewContainerRef}) windowContainer;
  componentRef: ComponentRef<TicketScreenWindowComponent>;

  openScreenInNewTab() {
    this.windowContainer.clear();
    this.componentRef = this.windowContainer.createComponent(TicketScreenWindowComponent);
  }

}
