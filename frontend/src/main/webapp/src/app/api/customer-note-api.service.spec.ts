import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {CustomerNoteApiService} from './customer-note-api.service';

describe('CustomerNoteApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: CustomerNoteApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ReactiveFormsModule],
      providers: [CustomerNoteApiService]
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

});
