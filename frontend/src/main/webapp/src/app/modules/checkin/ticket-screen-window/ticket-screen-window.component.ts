import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CdkPortal, DomPortalOutlet} from '@angular/cdk/portal';

@Component({
  selector: 'tafel-ticket-screen-window',
  templateUrl: 'ticket-screen-window.component.html'
})
export class TicketScreenWindowComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(CdkPortal) portal: CdkPortal;
  private externalWindow: Window = null;

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.externalWindow = window.open(
      '',
      '',
      'width=800,height=800,left=0,top=0'
    );

    const host = new DomPortalOutlet(
      this.externalWindow.document.body
    );

    host.attach(this.portal);
  }

  ngOnDestroy() {
    this.externalWindow.close();
  }

}
