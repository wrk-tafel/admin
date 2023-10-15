import {TestBed} from '@angular/core/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {ToastOptions, ToastService, ToastType} from './toast.service';

describe('ToastService', () => {
    let service: ToastService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [
                ToastService
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
