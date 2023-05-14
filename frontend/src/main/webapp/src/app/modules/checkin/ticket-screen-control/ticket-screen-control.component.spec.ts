import {TestBed, waitForAsync} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {TicketScreenControlComponent} from './ticket-screen-control.component';
import {WebsocketService} from '../../../common/websocket/websocket.service';
import {DistributionApiService, TicketNumberResponse} from '../../../api/distribution-api.service';
import {TicketScreenMessage} from '../ticket-screen/ticket-screen.component';
import {of} from "rxjs";

describe('TicketScreenControlComponent', () => {
  let websocketService: jasmine.SpyObj<WebsocketService>;
  let distributionApiService: jasmine.SpyObj<DistributionApiService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule],
      providers: [
        {
          provide: WebsocketService,
          useValue: jasmine.createSpyObj('WebsocketService', ['publish'])
        },
        {
          provide: DistributionApiService,
          useValue: jasmine.createSpyObj('DistributionApiService', ['getCurrentTicket', 'getNextTicket'])
        }
      ]
    }).compileComponents();

    websocketService = TestBed.inject(WebsocketService) as jasmine.SpyObj<WebsocketService>;
    distributionApiService = TestBed.inject(DistributionApiService) as jasmine.SpyObj<DistributionApiService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('openScreenInNewTab', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    spyOn(window, 'open');

    component.openScreenInNewTab();

    expect(window.open).toHaveBeenCalledWith('/#/anmeldung/ticketmonitor', '_blank');
  });

  it('showStartTime', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    component.form.get('startTime').setValue('19:00');

    component.showStartTime();

    const expectedStartTime = new Date();
    expectedStartTime.setHours(19);
    expectedStartTime.setMinutes(0);
    const expectedMessage: TicketScreenMessage = {startTime: expectedStartTime};

    expect(websocketService.publish).toHaveBeenCalledWith({
      destination: '/topic/ticket-screen',
      body: JSON.stringify(expectedMessage)
    });
  });

  it('showCurrentTicket', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    const testTicket = 123;

    const response: TicketNumberResponse = {ticketNumber: testTicket};
    distributionApiService.getCurrentTicket.and.returnValue(of(response));

    component.showCurrentTicket();

    const expectedMessage: TicketScreenMessage = {ticketNumber: testTicket};
    expect(websocketService.publish).toHaveBeenCalledWith({
      destination: '/topic/ticket-screen',
      body: JSON.stringify(expectedMessage)
    });
  });

  it('showNextTicket', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    const testTicket = 456;

    const response: TicketNumberResponse = {ticketNumber: testTicket};
    distributionApiService.getNextTicket.and.returnValue(of(response));

    component.showNextTicket();

    const expectedMessage: TicketScreenMessage = {ticketNumber: testTicket};
    expect(websocketService.publish).toHaveBeenCalledWith({
      destination: '/topic/ticket-screen',
      body: JSON.stringify(expectedMessage)
    });
  });

});
