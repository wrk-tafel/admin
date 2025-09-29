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

  it('get distributions', () => {
    apiService.getDistributions().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/distributions'});
    req.flush(null);
    httpMock.verify();
  });

  it('create new distribution', () => {
    const testResponse: DistributionItem = {
      id: 123,
      startedAt: new Date()
    };

    apiService.createNewDistribution().subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/distributions/new'});
    req.flush(testResponse);
    httpMock.verify();
  });

  it('close distribution', () => {
    const forceClose = true;
    apiService.closeDistribution(forceClose).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/distributions/close?forceClose=true'});
    req.flush(null);
    httpMock.verify();
  });

  it('assign customer', () => {
    const requestBody: AssignCustomerRequest = {customerId: 1, ticketNumber: 100, costContributionPaid: true};
    apiService.assignCustomer(requestBody.customerId, requestBody.ticketNumber, requestBody.costContributionPaid).subscribe();

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

  it('send emails for distribution', () => {
    const distributionId = 123;
    apiService.sendMails(distributionId).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: `/distributions/${distributionId}/send-mails`});
    req.flush(null);
    httpMock.verify();
  });

});
