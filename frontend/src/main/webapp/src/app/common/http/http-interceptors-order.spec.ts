import type { MockedObject } from 'vitest';
import { HttpClient, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorHandlerInterceptor } from './errorhandler-interceptor.service';
import { xsrfInterceptor } from './xsrf-interceptor.service';
import { AuthenticationService } from '../security/authentication.service';
import { TafelToastrService } from '../components/tafel-toastr/tafel-toastr.service';
import { CookieService } from 'ngx-cookie-service';

// Registration order matters: a response flows back through `withInterceptors([...])` in reverse,
// so whichever interceptor is registered last (closest to the backend) sees it first. This locks
// down that `errorHandlerInterceptor` is registered before `xsrfInterceptor` (see app.config.ts) -
// otherwise a 403 caused only by the XSRF-token race would toast/log even though the retry the
// xsrf interceptor performs succeeds. See #3530.
describe('HTTP interceptor order (errorHandlerInterceptor before xsrfInterceptor)', () => {
    let httpTestingController: HttpTestingController;
    let httpClient: HttpClient;
    let cookieServiceSpy: MockedObject<CookieService>;
    let toastrSpy: MockedObject<TafelToastrService>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr(), withInterceptors([errorHandlerInterceptor, xsrfInterceptor])),
                provideHttpClientTesting(),
                {
                    provide: AuthenticationService,
                    useValue: {
                        redirectToLogin: vi.fn().mockName('AuthenticationService.redirectToLogin'),
                        isAuthenticated: vi.fn().mockName('AuthenticationService.isAuthenticated').mockReturnValue(false)
                    }
                },
                {
                    provide: TafelToastrService,
                    useValue: {
                        error: vi.fn().mockName('TafelToastrService.error'),
                        success: vi.fn().mockName('TafelToastrService.success'),
                        warning: vi.fn().mockName('TafelToastrService.warning')
                    }
                },
                {
                    provide: CookieService,
                    useValue: {
                        get: vi.fn().mockName('CookieService.get')
                    }
                }
            ]
        });

        httpTestingController = TestBed.inject(HttpTestingController);
        httpClient = TestBed.inject(HttpClient);
        cookieServiceSpy = TestBed.inject(CookieService) as MockedObject<CookieService>;
        toastrSpy = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    it('does not toast a 403 that the xsrf retry resolves', () => {
        cookieServiceSpy.get.mockReturnValueOnce('').mockReturnValueOnce('fresh-token');

        let result: unknown;
        httpClient.post('/test', {}).subscribe({ next: (res) => result = res });

        const firstRequest = httpTestingController.expectOne('/test');
        firstRequest.flush(null, { status: 403, statusText: 'Forbidden' });

        const retriedRequest = httpTestingController.expectOne('/test');
        retriedRequest.flush({ ok: true });

        expect(result).toEqual({ ok: true });
        expect(toastrSpy.error).not.toHaveBeenCalled();
    });

    it('still toasts a 403 the xsrf interceptor gives up on', () => {
        cookieServiceSpy.get.mockReturnValue('');

        let result: unknown;
        httpClient.post('/test', {}).subscribe({ error: (err) => result = err });

        httpTestingController.expectOne('/test').flush(null, { status: 403, statusText: 'Forbidden' });

        expect(result).toBeDefined();
        expect(toastrSpy.error).toHaveBeenCalled();
    });
});
