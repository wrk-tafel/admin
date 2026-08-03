import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {CustomerApiService, CustomerMergePreview, Gender} from '../../../api/customer-api.service';
import {of} from 'rxjs';
import {CustomerMergePreviewResolver} from './customer-merge-preview-resolver.component';
import {ActivatedRouteSnapshot} from '@angular/router';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

describe('CustomerMergePreviewResolver', () => {
  let apiService: MockedObject<CustomerApiService>;
  let resolver: CustomerMergePreviewResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: CustomerApiService,
          useValue: {
            getMergePreview: vi.fn().mockName('CustomerApiService.getMergePreview')
          }
        },
        CustomerMergePreviewResolver
      ]
    });

    apiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
    resolver = TestBed.inject(CustomerMergePreviewResolver);
  });

  it('resolve parses the target id and the comma-separated source ids from the query params', () => {
    const mockPreview: CustomerMergePreview = {
      target: {id: 100, gender: Gender.MALE, address: {}},
      sources: [],
      fieldConflicts: [],
      persons: [],
      distributionCollisions: [],
      noteCount: 0,
      documentCount: 0
    };
    apiService.getMergePreview.mockReturnValue(of(mockPreview));

    const activatedRoute = <ActivatedRouteSnapshot><unknown>{
      params: {id: '100'},
      queryParams: {quellen: '200,300'}
    };
    resolver.resolve(activatedRoute).subscribe((preview: CustomerMergePreview) => {
      expect(preview).toEqual(mockPreview);
    });

    expect(apiService.getMergePreview).toHaveBeenCalledWith(100, [200, 300]);
  });

});
