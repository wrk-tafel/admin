import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {DistributionApiService} from './distribution-api.service';
import {DistributionTicketApiService} from './distribution-ticket-api.service';
import {provideHttpClient} from '@angular/common/http';
import {provideZonelessChangeDetection} from "@angular/core";

describe('DistributionTicketApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: DistributionTicketApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
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

    const req = httpMock.expectOne({method: 'GET', url: `/distributions/tickets/customers/${customerId}`});
    req.flush(null);
    httpMock.verify();
  });

  it('delete current ticket of customer', () => {
    const customerId = 123;
    apiService.deleteCurrentTicketOfCustomer(customerId).subscribe();

    const req = httpMock.expectOne({method: 'DELETE', url: `/distributions/tickets/customers/${customerId}`});
    req.flush(null);
    httpMock.verify();
  });

});
