import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {
  AssignCustomerRequest,
  DistributionApiService,
  DistributionItem,
  DistributionItemResponse
} from './distribution-api.service';
import {WebsocketService} from '../common/websocket/websocket.service';
import {of} from 'rxjs';
import {IMessage} from '@stomp/stompjs';
import {provideHttpClient} from "@angular/common/http";

describe('DistributionApiService', () => {
  let httpMock: HttpTestingController;
  let websocketService: jasmine.SpyObj<WebsocketService>;
  let apiService: DistributionApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: WebsocketService,
          useValue: jasmine.createSpyObj('WebsocketService', ['watch'])
        }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    websocketService = TestBed.inject(WebsocketService) as jasmine.SpyObj<WebsocketService>;
    apiService = TestBed.inject(DistributionApiService);
  });

  it('get current distribution', () => {
    const testResponse: DistributionItemResponse = {
      distribution: {
        id: 123
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

    apiService.getCurrentDistribution().subscribe();

    expect(websocketService.watch).toHaveBeenCalledWith('/topic/distributions');
  });

  it('create new distribution', () => {
    const testResponse: DistributionItem = {
      id: 123
    };

    apiService.createNewDistribution().subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/distributions/new'});
    req.flush(testResponse);
    httpMock.verify();
  });

  it('close distribution', () => {
    apiService.closeDistribution().subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/distributions/close'});
    req.flush(null);
    httpMock.verify();
  });

  it('assign customer', () => {
    const requestBody: AssignCustomerRequest = {customerId: 1, ticketNumber: 100};
    apiService.assignCustomer(requestBody.customerId, requestBody.ticketNumber).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/distributions/customers'});
    req.flush(null);
    httpMock.verify();

    expect(req.request.body).toEqual(requestBody);
  });

  it('download customer list', () => {
    apiService.downloadCustomerList().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/distributions/customers/generate-pdf'});
    req.flush(null);
    httpMock.verify();
  });

});
