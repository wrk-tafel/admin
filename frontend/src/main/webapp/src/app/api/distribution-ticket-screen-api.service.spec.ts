import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {
  DistributionTicketScreenApiService,
  TicketScreenShowNextTicketRequest,
  TicketScreenShowTextRequest
} from './distribution-ticket-screen-api.service';

describe('DistributionTicketScreenApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: DistributionTicketScreenApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
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

    const req = httpMock.expectOne({method: 'POST', url: `/distributions/ticket-screen/show-text`});
    expect(req.request.body).toEqual(request);

    req.flush(null);
    httpMock.verify();
  });

  it('show current ticket', () => {
    apiService.showCurrentTicket().subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/distributions/ticket-screen/show-current'});
    req.flush(null);
    httpMock.verify();
  });

  it('show previous ticket', () => {
    apiService.showPreviousTicket().subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/distributions/ticket-screen/show-previous'});
    req.flush(null);
    httpMock.verify();
  });

  it('show next ticket', () => {
    const request: TicketScreenShowNextTicketRequest = {
      costContributionPaid: true
    };
    apiService.showNextTicket(request.costContributionPaid).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/distributions/ticket-screen/show-next'});
    expect(req.request.body).toEqual(request);

    req.flush(null);
    httpMock.verify();
  });

});
