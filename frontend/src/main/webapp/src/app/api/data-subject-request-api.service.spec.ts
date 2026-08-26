import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {DataSubjectMatch, DataSubjectRequestApiService} from './data-subject-request-api.service';

describe('DataSubjectRequestApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: DataSubjectRequestApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DataSubjectRequestApiService,
        provideHttpClient(withXhr()),
        provideHttpClientTesting()
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(DataSubjectRequestApiService);
  });

  it('search sends the search input as a query parameter', () => {
    apiService.search('Muster').subscribe();

    const req = httpMock.expectOne(request => request.url === '/data-subject-requests/search');
    expect(req.request.params.get('searchInput')).toBe('Muster');
    req.flush({items: []});
    httpMock.verify();
  });

  it('exportMatches posts the selected matches and asks for a blob response', () => {
    const matches: DataSubjectMatch[] = [{type: 'CUSTOMER', id: 1}, {type: 'USER_ACCOUNT', id: 2}];

    apiService.exportMatches(matches).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/data-subject-requests/export'});
    expect(req.request.body).toEqual({matches});
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob());
    httpMock.verify();
  });

  it('deleteMatches posts the selected matches', () => {
    const matches: DataSubjectMatch[] = [{type: 'EMPLOYEE_WITHOUT_ACCOUNT', id: 3}];

    apiService.deleteMatches(matches).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/data-subject-requests/delete'});
    expect(req.request.body).toEqual({matches});
    req.flush({results: []});
    httpMock.verify();
  });
});
