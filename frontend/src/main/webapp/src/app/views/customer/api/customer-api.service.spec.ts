import { HttpClient, HttpRequest } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CustomerApiService } from './customer-api.service';

describe('CustomerApiService', () => {
  let client: HttpClient;
  let httpMock: HttpTestingController;
  let apiService: CustomerApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CustomerApiService]
    });

    client = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(CustomerApiService);
  });

  it('validate customer', () => {
    apiService.validate(null).subscribe();

    const req = httpMock.expectOne({ method: 'POST', url: '/customers/validate' });
    req.flush(null);
    httpMock.verify();
  });

  it('create customer', () => {
    apiService.createCustomer(null).subscribe();

    const req = httpMock.expectOne({ method: 'POST', url: '/customers' });
    req.flush(null);
    httpMock.verify();
  });

  it('get customer', () => {
    apiService.getCustomer(1).subscribe();

    const req = httpMock.expectOne({ method: 'GET', url: '/customers/1' });
    req.flush(null);
    httpMock.verify();
  });

  it('generate masterdata pdf', () => {
    apiService.generateMasterdataPdf(1).subscribe();

    const req = httpMock.expectOne({ method: 'GET', url: '/customers/1/generate-masterdata-pdf' });
    req.flush(null);
    httpMock.verify();
  });

  it('search customer with firstname and lastname', () => {
    apiService.searchCustomer('mustermann', 'max').subscribe();

    const req = httpMock.expectOne({ method: 'GET', url: '/customers?lastname=mustermann&firstname=max' });
    req.flush(null);
    httpMock.verify();
  });

  it('search customer with lastname only', () => {
    apiService.searchCustomer('mustermann').subscribe();

    const req = httpMock.expectOne({ method: 'GET', url: '/customers?lastname=mustermann' });
    req.flush(null);
    httpMock.verify();
  });

  it('search customer with firstname only', () => {
    apiService.searchCustomer(null, 'max').subscribe();

    const req = httpMock.expectOne({ method: 'GET', url: '/customers?firstname=max' });
    req.flush(null);
    httpMock.verify();
  });

});
