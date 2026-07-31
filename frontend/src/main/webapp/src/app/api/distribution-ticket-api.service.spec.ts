import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {DistributionApiService} from './distribution-api.service';
import {DistributionTicketApiService} from './distribution-ticket-api.service';
import {provideHttpClient, withXhr} from '@angular/common/http';

describe('DistributionTicketApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: DistributionTicketApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        DistributionApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(DistributionTicketApiService);
  });

  it('get current ticket for customer', () => {
    const customerId = 123;
    apiService.getCurrentTicketForCustomer(customerId).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: `/households/${customerId}/ticket`});
    req.flush(null);
    httpMock.verify();
  });

  it('delete current ticket of customer', () => {
    const customerId = 123;
    apiService.deleteCurrentTicketOfCustomer(customerId).subscribe();

    const req = httpMock.expectOne({method: 'DELETE', url: `/households/${customerId}/ticket`});
    req.flush(null);
    httpMock.verify();
  });

});
