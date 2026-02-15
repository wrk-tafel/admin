import {TestBed} from '@angular/core/testing';
import {ToastOptions, ToastService, ToastType} from './toast.service';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(ToastService);
  });

  it('showToast adds to queue', () => {
    const expectedOptions: ToastOptions = {type: ToastType.INFO, title: 'title-123', message: 'message-123'};

    service.showToast(expectedOptions);

    const queue = service.getToastQueue()();
    expect(queue.length).toBe(1);
    expect(queue[0]).toMatchObject(expectedOptions);
    expect(queue[0].id).toBeDefined();
  });

});
