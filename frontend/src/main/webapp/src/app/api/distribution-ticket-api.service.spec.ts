import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {DistributionApiService} from './distribution-api.service';
import {WebsocketService} from '../common/websocket/websocket.service';
import {DistributionTicketApiService} from './distribution-ticket-api.service';

describe('DistributionTicketApiService', () => {
  let httpMock: HttpTestingController;
  let websocketService: jasmine.SpyObj<WebsocketService>;
  let apiService: DistributionTicketApiService;

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

    httpMock = TestBed.inject(HttpTestingController);
    websocketService = TestBed.inject(WebsocketService) as jasmine.SpyObj<WebsocketService>;
    apiService = TestBed.inject(DistributionTicketApiService);
  });

  it('get current ticket', () => {
    apiService.getCurrentTicket().subscribe();

    const req = httpMock.expectOne('/distributions/tickets/current');
    req.flush(null);
    httpMock.verify();
  });

  it('get next ticket', () => {
    apiService.getNextTicket().subscribe();

    const req = httpMock.expectOne('/distributions/tickets/next');
    req.flush(null);
    httpMock.verify();
  });

});
