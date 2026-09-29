import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {of} from 'rxjs';
import {DocumentScannerApiService, ScannerFilesResponse} from './document-scanner-api.service';
import {SseService} from '../common/sse/sse.service';

describe('DocumentScannerApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: DocumentScannerApiService;
  let sseServiceSpy: { topic: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    sseServiceSpy = {
      topic: vi.fn().mockName('SseService.topic')
    };

    TestBed.configureTestingModule({
      providers: [
        DocumentScannerApiService,
        {provide: SseService, useValue: sseServiceSpy},
        provideHttpClient(withXhr()),
        provideHttpClientTesting()
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(DocumentScannerApiService);
  });

  it('get scanner files', () => {
    const mockResponse: ScannerFilesResponse = {
      items: [{fileName: 'scan1.pdf', displayName: 'Scan 1', sizeBytes: 100, modifiedAt: new Date()}]
    };

    apiService.getScannerFiles().subscribe((response) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/document-scanner-files'});
    req.flush(mockResponse);
    httpMock.verify();
  });

  it('listen for scanner file changes delegates to SseService', () => {
    const mockResponse: ScannerFilesResponse = {items: []};
    sseServiceSpy.topic.mockReturnValue(of(mockResponse));

    apiService.listenForScannerFileChanges().subscribe((response) => {
      expect(response).toEqual(mockResponse);
    });

    expect(sseServiceSpy.topic).toHaveBeenCalledWith('scanner-files');
  });

});
