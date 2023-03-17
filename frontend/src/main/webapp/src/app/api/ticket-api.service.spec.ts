import {HttpClient} from '@angular/common/http';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {NextTicketResponse, TicketApiService} from "./ticket-api.service";

describe('TicketApiService', () => {
  let client: HttpClient;
  let httpMock: HttpTestingController;
  let apiService: TicketApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TicketApiService]
    });

    client = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(TicketApiService);
  });

  it('get next ticket', () => {
    const testResponse: NextTicketResponse = {
      ticketNumber: 123,
    };

    apiService.getNextTicket().subscribe((response: NextTicketResponse) => {
      expect(response).toEqual(testResponse);
    });

    const req = httpMock.expectOne('/tickets/next');
    req.flush(testResponse);
    httpMock.verify();
  });

});
