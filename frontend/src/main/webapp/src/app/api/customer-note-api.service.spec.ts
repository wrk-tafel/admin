import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {CreateCustomerNoteRequest, CustomerNoteApiService, CustomerNoteItem} from './customer-note-api.service';
import * as moment from 'moment';
import {provideHttpClient} from "@angular/common/http";

describe('CustomerNoteApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: CustomerNoteApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        CustomerNoteApiService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(CustomerNoteApiService);
  });

  it('get notes for customer', () => {
    apiService.getNotesForCustomer(1).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/customers/1/notes'});
    req.flush(null);
    httpMock.verify();
  });

  it('get notes for customer including page parameter', () => {
    apiService.getNotesForCustomer(1, 2).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/customers/1/notes?page=2'});
    req.flush(null);
    httpMock.verify();
  });

  it('create new note for customer', () => {
    const note = 'test note';
    const noteRequest: CreateCustomerNoteRequest = {
      note: note
    };
    const mockNoteItem: CustomerNoteItem = {
      author: 'author1',
      timestamp: moment().subtract(1, 'hour').toDate(),
      note: 'note from author 1'
    };

    apiService.createNewNote(1, note).subscribe((noteItem) => {
      expect(noteItem).toEqual(mockNoteItem);
    });

    const req = httpMock.expectOne({method: 'POST', url: '/customers/1/notes'});
    expect(req.request.body).toEqual(noteRequest);

    req.flush(mockNoteItem);
    httpMock.verify();
  });

});
