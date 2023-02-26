import {HttpClient} from '@angular/common/http';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {DistributionApiService, DistributionItem} from './distribution-api.service';

describe('DistributionApiService', () => {
  let client: HttpClient;
  let httpMock: HttpTestingController;
  let apiService: DistributionApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DistributionApiService]
    });

    client = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(DistributionApiService);
  });

  it('get current distribution', () => {
    const testResponse: DistributionItem = {
      id: 123
    };

    apiService.getCurrentDistribution().subscribe((response: DistributionItem) => {
      expect(response).toEqual(testResponse);
    });

    const req = httpMock.expectOne('/distributions/current');
    req.flush(testResponse);
    httpMock.verify();
  });

  it('create new distribution', () => {
    const testResponse: DistributionItem = {
      id: 123
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

});
