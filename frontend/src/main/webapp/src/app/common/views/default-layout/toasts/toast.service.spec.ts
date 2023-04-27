import {TestBed} from '@angular/core/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {ToastService} from './toast.service';

describe('ToastService', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [
        ToastService
      ]
    });
  });

  it('TODO', () => {
    expect(true).toBeFalse();
  });

});
