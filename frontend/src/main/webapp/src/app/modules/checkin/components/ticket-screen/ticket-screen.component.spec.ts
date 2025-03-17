import {TestBed, waitForAsync} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {TicketScreenComponent, TicketScreenMessage} from './ticket-screen.component';
import {EMPTY} from 'rxjs';
import {IMessage} from '@stomp/stompjs';
import {WebsocketService} from '../../../../common/websocket/websocket.service';

describe('TicketScreenComponent', () => {
  let websocketService: jasmine.SpyObj<WebsocketService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [CommonModule],
      providers: [
        {
          provide: WebsocketService,
          useValue: jasmine.createSpyObj('WebsocketService', ['connect', 'watch'])
        }
      ]
    }).compileComponents();

    websocketService = TestBed.inject(WebsocketService) as jasmine.SpyObj<WebsocketService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(TicketScreenComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('init subscribes to topic', () => {
    const fixture = TestBed.createComponent(TicketScreenComponent);
    const component = fixture.componentInstance;
    websocketService.watch.and.returnValue(EMPTY);

    component.ngOnInit();

    expect(websocketService.connect).toHaveBeenCalled();
    expect(websocketService.watch).toHaveBeenCalledWith('/topic/ticket-screen');
  });

  it('process message fills data correctly', () => {
    const fixture = TestBed.createComponent(TicketScreenComponent);
    const component = fixture.componentInstance;

    const ticketMessage: TicketScreenMessage = {startTime: new Date(), ticketNumber: 123};
    const testMessage: IMessage = {
      body: JSON.stringify(ticketMessage),
      ack: null,
      nack: null,
      headers: null,
      command: null,
      binaryBody: null,
      isBinaryBody: false
    };
    component.processMessage(testMessage);

    expect(new Date(component.startTime)).toEqual(ticketMessage.startTime);
    expect(component.ticketNumber).toBe(ticketMessage.ticketNumber);
  });

});
