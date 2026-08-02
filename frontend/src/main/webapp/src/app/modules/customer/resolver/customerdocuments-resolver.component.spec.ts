import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import dayjs from 'dayjs';
import {of} from 'rxjs';
import {ActivatedRouteSnapshot} from '@angular/router';
import {CustomerDocumentsResolver} from './customerdocuments-resolver.component';
import {
  CustomerDocumentApiService,
  CustomerDocumentsResponse,
  DocumentType
} from '../../../api/customer-document-api.service';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

describe('CustomerDocumentsResolver', () => {
  let apiService: MockedObject<CustomerDocumentApiService>;
  let resolver: CustomerDocumentsResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: CustomerDocumentApiService,
          useValue: {
            getDocumentsForCustomer: vi.fn().mockName('CustomerDocumentApiService.getDocumentsForCustomer')
          }
        },
        CustomerDocumentsResolver
      ]
    });

    apiService = TestBed.inject(CustomerDocumentApiService) as MockedObject<CustomerDocumentApiService>;
    resolver = TestBed.inject(CustomerDocumentsResolver);
  });

  it('resolve', () => {
    const customerId = 123;
    const mockDocumentsResponse: CustomerDocumentsResponse = {
      items: [
        {
          id: 1,
          documentType: DocumentType.ID,
          fileName: 'ausweis.jpg',
          uploadedAt: dayjs().subtract(1, 'hour').toDate()
        }
      ]
    };
    apiService.getDocumentsForCustomer.mockReturnValue(of(mockDocumentsResponse));

    const activatedRoute = <ActivatedRouteSnapshot><unknown>{params: {id: customerId}};
    resolver.resolve(activatedRoute).subscribe((response: CustomerDocumentsResponse) => {
      expect(response).toEqual(mockDocumentsResponse);
    });

    expect(apiService.getDocumentsForCustomer).toHaveBeenCalledWith(customerId);
  });

});
