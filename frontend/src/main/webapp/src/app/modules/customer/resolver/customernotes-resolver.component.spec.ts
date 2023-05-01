import {HttpClientTestingModule} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import * as moment from 'moment/moment';
import {of} from 'rxjs';
import {ActivatedRouteSnapshot} from '@angular/router';
import {CustomerNotesResolver} from './customernotes-resolver.component';
import {CustomerNoteApiService, CustomerNoteItem, CustomerNotesResponse} from '../../../api/customer-note-api.service';

describe('CustomerNotesResolver', () => {
  let apiService: jasmine.SpyObj<CustomerNoteApiService>;
  let resolver: CustomerNotesResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
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
    const mockNotes: CustomerNotesResponse = {
      notes: [
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
      ]
    };
    apiService.getNotesForCustomer.withArgs(customerId).and.returnValue(of(mockNotes));

    const activatedRoute = <ActivatedRouteSnapshot><unknown>{params: {id: customerId}};
    resolver.resolve(activatedRoute).subscribe((notes: CustomerNoteItem[]) => {
      expect(notes).toEqual(mockNotes.notes);
    });

    expect(apiService.getNotesForCustomer).toHaveBeenCalledWith(customerId);
  });

});
