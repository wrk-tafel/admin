import {TestBed, waitForAsync} from '@angular/core/testing';
import {DashboardComponent, DashboardData} from './dashboard.component';
import {WebsocketService} from '../../common/websocket/websocket.service';
import {IMessage} from '@stomp/stompjs';
import {of} from 'rxjs';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

describe('DashboardComponent', () => {
  let websocketService: jasmine.SpyObj<WebsocketService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: WebsocketService,
          useValue: jasmine.createSpyObj('WebsocketService', ['watch'])
        }
      ]
    }).compileComponents();

    websocketService = TestBed.inject(WebsocketService) as jasmine.SpyObj<WebsocketService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('init subscribes data', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    const component = fixture.componentInstance;

    const mockData: DashboardData = {
      registeredCustomers: 123
    };
    const testMessage: IMessage = {
      body: JSON.stringify(mockData),
      ack: null,
      nack: null,
      headers: null,
      command: null,
      binaryBody: null,
      isBinaryBody: false
    };
    websocketService.watch.and.returnValues(of(testMessage));

    component.ngOnInit();

    expect(component.data).toEqual(mockData);
  });

});
