import type { MockedObject } from 'vitest';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
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

    it('retries once with a refreshed token after a 403 if the cookie has since appeared', () => {
        cookieServiceSpy.get.mockReturnValueOnce('').mockReturnValueOnce('fresh-token');

        let result: unknown;
        httpClient.post('/test', {}).subscribe({error: (err) => result = err});

        const firstRequest = httpTestingController.expectOne('/test');
        expect(firstRequest.request.headers.has('X-XSRF-TOKEN')).toBe(false);
        firstRequest.flush(null, {status: 403, statusText: 'Forbidden'});

        const retriedRequest = httpTestingController.expectOne('/test');
        expect(retriedRequest.request.headers.get('X-XSRF-TOKEN')).toBe('fresh-token');
        retriedRequest.flush({});

        expect(result).toBeUndefined();
    });

    // The value read back after the 403 can be identical to the one just sent and still be the one
    // the server accepts (the cookie can move between the read and the request reaching the
    // server), so an unchanged cookie is not a reason to give up - see #3101.
    it('retries once after a 403 even when the cookie is unchanged', () => {
        cookieServiceSpy.get.mockReturnValue('token-value');

        let result: unknown;
        httpClient.post('/test', {}).subscribe({error: (err) => result = err});

        const firstRequest = httpTestingController.expectOne('/test');
        firstRequest.flush(null, {status: 403, statusText: 'Forbidden'});

        const retriedRequest = httpTestingController.expectOne('/test');
        expect(retriedRequest.request.headers.get('X-XSRF-TOKEN')).toBe('token-value');
        retriedRequest.flush({});

        expect(result).toBeUndefined();
    });

    it('gives up on a 403 when there is no token cookie to retry with', () => {
        cookieServiceSpy.get.mockReturnValue('');

        let result: unknown;
        httpClient.post('/test', {}).subscribe({error: (err) => result = err});

        const request = httpTestingController.expectOne('/test');
        request.flush(null, {status: 403, statusText: 'Forbidden'});

        expect(result).toBeInstanceOf(HttpErrorResponse);
        expect((result as HttpErrorResponse).status).toBe(403);
    });

    it('does not retry a second time when the retry is denied as well', () => {
        cookieServiceSpy.get.mockReturnValue('token-value');

        let result: unknown;
        httpClient.post('/test', {}).subscribe({error: (err) => result = err});

        httpTestingController.expectOne('/test').flush(null, {status: 403, statusText: 'Forbidden'});
        httpTestingController.expectOne('/test').flush(null, {status: 403, statusText: 'Forbidden'});

        expect(result).toBeInstanceOf(HttpErrorResponse);
        expect((result as HttpErrorResponse).status).toBe(403);
    });

});
