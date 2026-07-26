import type { MockedObject } from 'vitest';
import { HttpClient, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { xsrfInterceptor } from './xsrf-interceptor.service';
import { CookieService } from 'ngx-cookie-service';

describe('XsrfInterceptor', () => {
    let httpTestingController: HttpTestingController;
    let httpClient: HttpClient;
    let cookieServiceSpy: MockedObject<CookieService>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr(), withInterceptors([xsrfInterceptor])),
                provideHttpClientTesting(),
                {
                    provide: CookieService,
                    useValue: {
                        get: vi.fn().mockName('CookieService.get')
                    }
                }
            ],
        });

        httpTestingController = TestBed.inject(HttpTestingController);
        httpClient = TestBed.inject(HttpClient);
        cookieServiceSpy = TestBed.inject(CookieService) as MockedObject<CookieService>;
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    it('adds the token header on a POST request', () => {
        cookieServiceSpy.get.mockReturnValue('token-value');

        httpClient.post('/test', {}).subscribe();

        const request = httpTestingController.expectOne('/test');
        expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('token-value');
        expect(cookieServiceSpy.get).toHaveBeenCalledWith('XSRF-TOKEN');
    });

    it('adds the token header on a DELETE request', () => {
        cookieServiceSpy.get.mockReturnValue('token-value');

        httpClient.delete('/test').subscribe();

        const request = httpTestingController.expectOne('/test');
        expect(request.request.headers.get('X-XSRF-TOKEN')).toBe('token-value');
    });

    it('doesnt add the header on a GET request', () => {
        cookieServiceSpy.get.mockReturnValue('token-value');

        httpClient.get('/test').subscribe();

        const request = httpTestingController.expectOne('/test');
        expect(request.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    });

    it('doesnt add the header when the cookie is missing', () => {
        cookieServiceSpy.get.mockReturnValue('');

        httpClient.post('/test', {}).subscribe();

        const request = httpTestingController.expectOne('/test');
        expect(request.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    });

});
