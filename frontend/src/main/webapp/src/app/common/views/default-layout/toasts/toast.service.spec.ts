import {TestBed} from '@angular/core/testing';
import {ToastOptions, ToastService, ToastType} from './toast.service';
import {provideHttpClient} from "@angular/common/http";
import {provideHttpClientTesting} from "@angular/common/http/testing";

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

  it('showToast publishes to subject', () => {
    const expectedOptions: ToastOptions = {type: ToastType.INFO, title: 'title-123', message: 'message-123'};

    service.addToastSubject.subscribe((options: ToastOptions) => {
      expect(options).toEqual(options);
    });

    service.showToast(expectedOptions);
  });

});
