import {TestBed} from '@angular/core/testing';
import * as moment from 'moment/moment';
import {of} from 'rxjs';
import {ActivatedRouteSnapshot} from '@angular/router';
import {CustomerNotesResolver} from './customernotes-resolver.component';
import {CustomerNoteApiService, CustomerNotesResponse} from '../../../api/customer-note-api.service';
import {provideHttpClient} from "@angular/common/http";
import {provideHttpClientTesting} from "@angular/common/http/testing";

describe('CustomerNotesResolver', () => {
  let apiService: jasmine.SpyObj<CustomerNoteApiService>;
  let resolver: CustomerNotesResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CustomerNoteApiService,
          useValue: jasmine.createSpyObj('CustomerNoteApiService', ['getNotesForCustomer'])
        },
        CustomerNotesResolver
      ]
    });

    apiService = TestBed.inject(CustomerNoteApiService) as jasmine.SpyObj<CustomerNoteApiService>;
    resolver = TestBed.inject(CustomerNotesResolver);
  });

  it('resolve', () => {
    const customerId = 123;
    const mockNotesResponse: CustomerNotesResponse = {
      items: [
        {
          author: 'author1',
          timestamp: moment().subtract(1, 'hour').toDate(),
          note: 'note from author 1'
        },
        {
          author: 'author2',
          timestamp: moment().subtract(2, 'hour').toDate(),
          note: 'note from author 2'
        }
      ],
      totalCount: 1,
      currentPage: 0,
      totalPages: 1,
      pageSize: 5
    };
    apiService.getNotesForCustomer.withArgs(customerId).and.returnValue(of(mockNotesResponse));

    const activatedRoute = <ActivatedRouteSnapshot><unknown>{params: {id: customerId}};
    resolver.resolve(activatedRoute).subscribe((response: CustomerNotesResponse) => {
      expect(response).toEqual(mockNotesResponse);
    });

    expect(apiService.getNotesForCustomer).toHaveBeenCalledWith(customerId);
  });

});
