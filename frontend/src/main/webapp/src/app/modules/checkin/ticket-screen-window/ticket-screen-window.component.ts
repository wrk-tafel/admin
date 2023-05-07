import {
  AfterViewInit,
  ApplicationRef,
  Component,
  ComponentFactoryResolver,
  Injector,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {CdkPortal, DomPortalOutlet} from '@angular/cdk/portal';

@Component({
  selector: 'tafel-ticket-screen-window',
  templateUrl: 'ticket-screen-window.component.html'
})
export class TicketScreenWindowComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(CdkPortal) portal: CdkPortal;
  private externalWindow = null;

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private applicationRef: ApplicationRef,
    private injector: Injector
  ) {
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.externalWindow = window.open(
      '',
      '',
      'width=800,height=800,left=0,top=0'
    );

    const host = new DomPortalOutlet(
      this.externalWindow.document.body,
      this.componentFactoryResolver,
      this.applicationRef,
      this.injector
    );

    host.attach(this.portal);
  }

  ngOnDestroy() {
    this.externalWindow.close();
  }

}
