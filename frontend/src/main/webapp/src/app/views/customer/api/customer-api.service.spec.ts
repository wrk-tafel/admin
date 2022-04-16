import { HttpClient } from "@angular/common/http";
import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { CustomerApiService } from "./customer-api.service";

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

  it('create customer successfully', () => {
    // TODO impl
    expect(true).toBe(false);

    //apiService.createCustomer()

    /*
    .subscribe((data) => {
      expect(data).toEqual(mockCountries);
    });

    const req = httpMock.expectOne('/countries');
    req.flush({ items: mockCountries });
    httpMock.verify();
    */
  });

});
