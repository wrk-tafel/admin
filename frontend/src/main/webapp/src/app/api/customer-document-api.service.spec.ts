import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {CustomerDocumentApiService, CustomerDocumentItem, DocumentType} from './customer-document-api.service';
import dayjs from 'dayjs';

describe('CustomerDocumentApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: CustomerDocumentApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CustomerDocumentApiService,
        provideHttpClient(withXhr()),
        provideHttpClientTesting()
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(CustomerDocumentApiService);
  });

  it('get documents for customer', () => {
    apiService.getDocumentsForCustomer(1).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households/1/documents'});
    req.flush(null);
    httpMock.verify();
  });

  it('upload document', () => {
    const file = new File(['content'], 'proof.pdf', {type: 'application/pdf'});
    const mockDocumentItem: CustomerDocumentItem = {
      id: 1,
      documentType: DocumentType.PROOF_OF_INCOME,
      fileName: 'proof.pdf',
      uploadedAt: dayjs().toDate()
    };

    apiService.uploadDocument(1, DocumentType.PROOF_OF_INCOME, file, 5).subscribe((documentItem) => {
      expect(documentItem).toEqual(mockDocumentItem);
    });

    const req = httpMock.expectOne({method: 'POST', url: '/households/1/documents'});
    expect(req.request.body instanceof FormData).toBe(true);
    const body = req.request.body as FormData;
    expect(body.get('documentType')).toEqual('PROOF_OF_INCOME');
    expect(body.get('personId')).toEqual('5');
    expect(body.get('file')).toEqual(file);

    req.flush(mockDocumentItem);
    httpMock.verify();
  });

  it('upload document without personId omits it from the form data', () => {
    const file = new File(['content'], 'proof.pdf', {type: 'application/pdf'});

    apiService.uploadDocument(1, DocumentType.PROOF_OF_INCOME, file).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/households/1/documents'});
    const body = req.request.body as FormData;
    expect(body.get('personId')).toBeNull();

    req.flush(null);
    httpMock.verify();
  });

  it('import scanner document', () => {
    const mockDocumentItem: CustomerDocumentItem = {
      id: 2,
      documentType: DocumentType.OTHER,
      fileName: 'scan.pdf',
      uploadedAt: dayjs().toDate()
    };

    apiService.importScannerDocument(1, 'scan.pdf', DocumentType.OTHER, 5).subscribe((documentItem) => {
      expect(documentItem).toEqual(mockDocumentItem);
    });

    const req = httpMock.expectOne({method: 'POST', url: '/households/1/documents/from-scanner-file'});
    expect(req.request.body).toEqual({fileName: 'scan.pdf', documentType: DocumentType.OTHER, personId: 5});

    req.flush(mockDocumentItem);
    httpMock.verify();
  });

  it('download document', () => {
    apiService.downloadDocument(1, 2).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/households/1/documents/2'});
    expect(req.request.responseType).toEqual('blob');
    req.flush(new Blob());
    httpMock.verify();
  });

  it('delete document', () => {
    apiService.deleteDocument(1, 2).subscribe();

    const req = httpMock.expectOne({method: 'DELETE', url: '/households/1/documents/2'});
    req.flush(null);
    httpMock.verify();
  });

});
