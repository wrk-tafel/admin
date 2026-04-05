import type { MockedObject } from 'vitest';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorHandlerInterceptor, TafelErrorResponse } from './errorhandler-interceptor.service';
import { AuthenticationService } from '../security/authentication.service';
import { ToastrService } from 'ngx-toastr';

describe('ErrorHandlerInterceptor', () => {
    let httpTestingController: HttpTestingController;
    let httpClient: HttpClient;
    let authServiceSpy: MockedObject<AuthenticationService>;
    let toastrSpy: MockedObject<ToastrService>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([errorHandlerInterceptor])),
                provideHttpClientTesting(),
                {
                    provide: AuthenticationService,
                    useValue: {
                        redirectToLogin: vi.fn().mockName("AuthenticationService.redirectToLogin"),
                        isAuthenticated: vi.fn().mockName("AuthenticationService.isAuthenticated")
                    }
                },
                {
                    provide: ToastrService,
                    useValue: {
                        error: vi.fn().mockName("ToastrService.error"),
                        info: vi.fn().mockName("ToastrService.info"),
                        success: vi.fn().mockName("ToastrService.success"),
                        warning: vi.fn().mockName("ToastrService.warning")
                    }
                }
            ]
        });

        httpTestingController = TestBed.inject(HttpTestingController);
        httpClient = TestBed.inject(HttpClient);
        authServiceSpy = TestBed.inject(AuthenticationService) as MockedObject<AuthenticationService>;
        toastrSpy = TestBed.inject(ToastrService) as MockedObject<ToastrService>;
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    it('generic http error', () => {
        authServiceSpy.isAuthenticated.mockReturnValue(false);

        /* eslint-disable @typescript-eslint/no-unused-vars */
        const observer = {
            error: error => {
                expect(toastrSpy.error).toHaveBeenCalledWith(
                    'Http failure response for /test: 500 Internal Server Error',
                    'HTTP 500 - Internal Server Error'
                );
            },
        };
        httpClient.get('/test').subscribe(observer);

        const mockReq = httpTestingController.expectOne('/test');
        const mockErrorResponse = { status: 500, statusText: 'Internal Server Error' };
        mockReq.flush(null, mockErrorResponse);
        httpTestingController.verify();
    });

    it('generic http 504 error', () => {
        authServiceSpy.isAuthenticated.mockReturnValue(false);

        /* eslint-disable @typescript-eslint/no-unused-vars */
        const observer = {
            error: error => {
                expect(toastrSpy.error).toHaveBeenCalledWith(
                    'Server nicht verfügbar!',
                    'HTTP 504 - Bad Gateway'
                );
            },
        };
        httpClient.get('/test').subscribe(observer);

        const mockReq = httpTestingController.expectOne('/test');
        const mockErrorResponse = { status: 504, statusText: 'Bad Gateway' };
        mockReq.flush(null, mockErrorResponse);
        httpTestingController.verify();
    });

    it('generic http 403 error', () => {
        authServiceSpy.isAuthenticated.mockReturnValue(false);

        /* eslint-disable @typescript-eslint/no-unused-vars */
        const observer = {
            error: error => {
                expect(toastrSpy.error).toHaveBeenCalledWith(
                    'Zugriff nicht erlaubt!',
                    'HTTP 403 - Forbidden'
                );
            },
        };
        httpClient.get('/test').subscribe(observer);

        const mockReq = httpTestingController.expectOne('/test');
        const mockErrorResponse = { status: 403, statusText: 'Forbidden' };
        mockReq.flush(null, mockErrorResponse);
        httpTestingController.verify();
    });

    it('specific spring http error', () => {
        authServiceSpy.isAuthenticated.mockReturnValue(false);

        /* eslint-disable @typescript-eslint/no-unused-vars */
        const observer = {
            error: _ => {
                expect(toastrSpy.error).toHaveBeenCalledWith(
                    'Custom message from body',
                    'HTTP 400 - Bad Request'
                );
            },
        };
        httpClient.get('/test').subscribe(observer);

        const mockReq = httpTestingController.expectOne('/test');
        const mockErrorResponse = {
            status: 400,
            statusText: 'Bad Request'
        };

        const errorBody: TafelErrorResponse = {
            message: 'Custom message from body'
        };
        mockReq.flush(errorBody, mockErrorResponse);
        httpTestingController.verify();
    });

    it('authentication expired and redirected to login', () => {
        authServiceSpy.isAuthenticated.mockReturnValue(true);

        /* eslint-disable @typescript-eslint/no-unused-vars */
        const observer = {
            error: _ => {
                expect(authServiceSpy.redirectToLogin).toHaveBeenCalled();
            },
        };
        httpClient.get('/test').subscribe(observer);

        const mockReq = httpTestingController.expectOne('/test');
        const mockErrorResponse = { status: 401, statusText: 'Unauthorized' };
        mockReq.flush(null, mockErrorResponse);
        httpTestingController.verify();
    });

});
