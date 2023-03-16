import {HttpClient} from '@angular/common/http';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {DistributionApiService, DistributionItem} from './distribution-api.service';
import {WebsocketService} from "../common/websocket/websocket.service";
import {of} from "rxjs";
import {IMessage} from "@stomp/stompjs";

describe('DistributionApiService', () => {
  let client: HttpClient;
  let httpMock: HttpTestingController;
  let websocketService: jasmine.SpyObj<WebsocketService>;
  let apiService: DistributionApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DistributionApiService,
        {
          provide: WebsocketService,
          useValue: jasmine.createSpyObj('WebsocketService', ['watch'])
        }
      ]
    });

    client = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    websocketService = TestBed.inject(WebsocketService) as jasmine.SpyObj<WebsocketService>;
    apiService = TestBed.inject(DistributionApiService);
  });

  it('get current distribution', () => {
    const testResponse: DistributionItem = {
      id: 123,
      state: {
        name: 'OPEN',
        stateLabel: 'Offen',
        actionLabel: 'Offen'
      }
    };

    apiService.getCurrentDistribution().subscribe((response: DistributionItem) => {
      expect(response).toEqual(testResponse);
    });

    const req = httpMock.expectOne('/distributions/current');
    req.flush(testResponse);
    httpMock.verify();
  });

  it('subscribe to current distribution', () => {
    const testResponse: DistributionItem = {
      id: 123,
      state: {
        name: 'OPEN',
        stateLabel: 'Offen',
        actionLabel: 'Offen'
      }
    };
    const testMessage: IMessage = {
      body: JSON.stringify(testResponse),
      ack: null,
      nack: null,
      headers: null,
      command: null,
      binaryBody: null,
      isBinaryBody: false
    };
    websocketService.watch.and.returnValue(of(testMessage));

    apiService.subscribeCurrentDistribution().subscribe((response: DistributionItem) => {
      expect(response).toEqual(testResponse);
    });

    expect(websocketService.watch).toHaveBeenCalledWith('/distributions/current');
  });

  it('create new distribution', () => {
    const testResponse: DistributionItem = {
      id: 123,
      state: {
        name: 'OPEN',
        stateLabel: 'Offen',
        actionLabel: 'Offen'
      }
    };

    apiService.createNewDistribution().subscribe((response: DistributionItem) => {
      expect(response).toEqual(testResponse);
    });

    const req = httpMock.expectOne('/distributions/new');
    req.flush(testResponse);
    httpMock.verify();
  });

  it('get states', () => {
    apiService.getStates().subscribe();

    const req = httpMock.expectOne('/distributions/states');
    req.flush(null);
    httpMock.verify();
  });

  it('switch to next state', () => {
    apiService.switchToNextState().subscribe();

    const req = httpMock.expectOne('/distributions/states/next');
    req.flush(null);
    httpMock.verify();
  });

});
