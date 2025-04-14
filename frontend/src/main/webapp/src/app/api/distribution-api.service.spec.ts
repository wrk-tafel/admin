import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {
  AssignCustomerRequest,
  DistributionApiService,
  DistributionItem,
  SaveDistributionNotesRequest,
  SaveDistributionStatisticRequest
} from './distribution-api.service';
import {provideHttpClient} from '@angular/common/http';

describe('DistributionApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: DistributionApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(DistributionApiService);
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

  it('save statistics', () => {
    const requestBody: SaveDistributionStatisticRequest = {employeeCount: 100, selectedShelterIds: [1, 2, 3]};
    apiService.saveStatistic(requestBody.employeeCount, requestBody.selectedShelterIds).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/distributions/statistics'});
    req.flush(null);
    httpMock.verify();

    expect(req.request.body).toEqual(requestBody);
  });

  it('save notes', () => {
    const requestBody: SaveDistributionNotesRequest = {notes: 'test notes'};
    apiService.saveNotes(requestBody.notes).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/distributions/notes'});
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
