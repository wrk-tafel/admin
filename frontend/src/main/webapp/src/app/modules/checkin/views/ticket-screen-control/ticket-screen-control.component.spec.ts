import {TestBed, waitForAsync} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {TicketScreenControlComponent} from './ticket-screen-control.component';
import {WebsocketService} from '../../../../common/websocket/websocket.service';
import {DistributionTicketApiService, TicketNumberResponse} from '../../../../api/distribution-ticket-api.service';
import {TicketScreenMessage} from '../../components/ticket-screen/ticket-screen.component';
import {of} from 'rxjs';
import {UrlHelperService} from '../../../../common/util/url-helper.service';

describe('TicketScreenControlComponent', () => {
  let websocketService: jasmine.SpyObj<WebsocketService>;
  let distributionTicketApiService: jasmine.SpyObj<DistributionTicketApiService>;
  let urlHelperSpy: jasmine.SpyObj<UrlHelperService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule],
      providers: [
        {
          provide: WebsocketService,
          useValue: jasmine.createSpyObj('WebsocketService', ['publish'])
        },
        {
          provide: DistributionTicketApiService,
          useValue: jasmine.createSpyObj('DistributionTicketApiService', ['getCurrentTicket', 'getNextTicket'])
        },
        {
          provide: UrlHelperService,
          useValue: jasmine.createSpyObj('UrlHelperService', ['getBaseUrl'])
        }
      ]
    }).compileComponents();

    websocketService = TestBed.inject(WebsocketService) as jasmine.SpyObj<WebsocketService>;
    distributionTicketApiService = TestBed.inject(DistributionTicketApiService) as jasmine.SpyObj<DistributionTicketApiService>;
    urlHelperSpy = TestBed.inject(UrlHelperService) as jasmine.SpyObj<UrlHelperService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('openScreenInNewTab', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;

    const testBaseUrl = 'http://test:1234/testcontext';
    urlHelperSpy.getBaseUrl.and.returnValue(testBaseUrl);
    spyOn(window, 'open');

    component.openScreenInNewTab();

    expect(window.open).toHaveBeenCalledWith(`${testBaseUrl}/#/anmeldung/ticketmonitor`, '_blank');
  });

  it('showStartTime', () => {
    const fixture = TestBed.createComponent(TicketScreenControlComponent);
    const component = fixture.componentInstance;
    component.form.get('startTime').setValue('19:00');

    component.showStartTime();

    const expectedStartTime = new Date();
    expectedStartTime.setHours(19);
    expectedStartTime.setMinutes(0);
    expectedStartTime.setSeconds(0);
    expectedStartTime.setMilliseconds(0);
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
    distributionTicketApiService.getCurrentTicket.and.returnValue(of(response));

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
    distributionTicketApiService.getNextTicket.and.returnValue(of(response));

    component.showNextTicket();

    const expectedMessage: TicketScreenMessage = {ticketNumber: testTicket};
    expect(websocketService.publish).toHaveBeenCalledWith({
      destination: '/topic/ticket-screen',
      body: JSON.stringify(expectedMessage)
    });
  });

});
