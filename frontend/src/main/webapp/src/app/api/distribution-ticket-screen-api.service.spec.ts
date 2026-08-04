import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {
  DistributionTicketScreenApiService,
  TicketScreenShowNextTicketRequest,
  TicketScreenShowTextRequest,
  TicketScreenTicketResponse
} from './distribution-ticket-screen-api.service';

describe('DistributionTicketScreenApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: DistributionTicketScreenApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        DistributionTicketScreenApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(DistributionTicketScreenApiService);
  });

  it('show text', () => {
    const request: TicketScreenShowTextRequest = {
      text: 'dummy text',
      value: 'dummy value'
    };
    apiService.showText(request.text, request.value).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/distributions/ticket-screen/show-text'});
    expect(req.request.body).toEqual(request);

    req.flush(null);
    httpMock.verify();
  });

  it('show current ticket', () => {
    const response: TicketScreenTicketResponse = {ticketNumber: 5, householdId: 100, pendingCostContribution: 12};
    let result: TicketScreenTicketResponse | undefined;
    apiService.showCurrentTicket().subscribe(r => result = r);

    const req = httpMock.expectOne({method: 'POST', url: '/distributions/ticket-screen/show-current'});
    req.flush(response);
    httpMock.verify();

    expect(result).toEqual(response);
  });

  it('show previous ticket', () => {
    const response: TicketScreenTicketResponse = {ticketNumber: 4, householdId: 101, pendingCostContribution: 0};
    let result: TicketScreenTicketResponse | undefined;
    apiService.showPreviousTicket().subscribe(r => result = r);

    const req = httpMock.expectOne({method: 'POST', url: '/distributions/ticket-screen/show-previous'});
    req.flush(response);
    httpMock.verify();

    expect(result).toEqual(response);
  });

  it('show next ticket', () => {
    const request: TicketScreenShowNextTicketRequest = {
      costContributionPaid: true
    };
    const response: TicketScreenTicketResponse = {ticketNumber: 6, householdId: 102, pendingCostContribution: 30};
    let result: TicketScreenTicketResponse | undefined;
    apiService.showNextTicket(request.costContributionPaid).subscribe(r => result = r);

    const req = httpMock.expectOne({method: 'POST', url: '/distributions/ticket-screen/show-next'});
    expect(req.request.body).toEqual(request);

    req.flush(response);
    httpMock.verify();

    expect(result).toEqual(response);
  });

});
