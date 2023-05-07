import {
  Component,
  ComponentFactory,
  ComponentFactoryResolver,
  ComponentRef,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import {TicketScreenWindowComponent} from '../ticket-screen-window/ticket-screen-window.component';

@Component({
  selector: 'tafel-ticket-screen-control',
  templateUrl: 'ticket-screen-control.component.html'
})
export class TicketScreenControlComponent {

  @ViewChild('windowContainer', {read: ViewContainerRef}) windowContainer;
  componentRef: ComponentRef<TicketScreenWindowComponent>;

  constructor(private resolver: ComponentFactoryResolver) {
  }

  openScreenInNewTab() {
    this.windowContainer.clear();
    const factory: ComponentFactory<TicketScreenWindowComponent> = this.resolver.resolveComponentFactory(TicketScreenWindowComponent);
    this.componentRef = this.windowContainer.createComponent(factory);
  }

}
