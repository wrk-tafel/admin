import type { MockedObject } from 'vitest';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorHandlerInterceptor } from './errorhandler-interceptor.service';
import { SUPPRESS_ERROR_TOAST } from './suppress-error-toast.token';
import { ProblemDetail } from '../api/problem-detail';
import { AuthenticationService } from '../security/authentication.service';
import {TafelToastrService} from '../components/tafel-toastr/tafel-toastr.service';
import {ClientLogService} from '../support/client-log.service';

describe('ErrorHandlerInterceptor', () => {
    let httpTestingController: HttpTestingController;
    let httpClient: HttpClient;
    let authServiceSpy: MockedObject<AuthenticationService>;
    let toastrSpy: MockedObject<TafelToastrService>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr(), withInterceptors([errorHandlerInterceptor])),
                provideHttpClientTesting(),
                {
                    provide: AuthenticationService,
                    useValue: {
                        redirectToLogin: vi.fn().mockName('AuthenticationService.redirectToLogin'),
                        isAuthenticated: vi.fn().mockName('AuthenticationService.isAuthenticated')
                    }
                },
                {
                    provide: TafelToastrService,
                    useValue: {
                        error: vi.fn().mockName('TafelToastrService.error'),
                        info: vi.fn().mockName('TafelToastrService.info'),
                        success: vi.fn().mockName('TafelToastrService.success'),
                        warning: vi.fn().mockName('TafelToastrService.warning')
                    }
                }
            ]
        });

        httpTestingController = TestBed.inject(HttpTestingController);
        httpClient = TestBed.inject(HttpClient);
        authServiceSpy = TestBed.inject(AuthenticationService) as MockedObject<AuthenticationService>;
        toastrSpy = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    it('generic http error with an unmapped status falls back to the generic message', () => {
        authServiceSpy.isAuthenticated.mockReturnValue(false);

        /* eslint-disable @typescript-eslint/no-unused-vars */
        const observer = {
            error: (error: any) => {
                expect(toastrSpy.error).toHaveBeenCalledWith(
                    'Es ist ein unerwarteter Fehler aufgetreten.',
                    'HTTP 418 - I\'m a teapot'
                );
            },
        };
        httpClient.get('/test').subscribe(observer);

        const mockReq = httpTestingController.expectOne('/test');
        const mockErrorResponse = { status: 418, statusText: 'I\'m a teapot' };
        mockReq.flush(null, mockErrorResponse);
        httpTestingController.verify();
    });

    it('http 500 error without a body (e.g. a raw servlet-container error page) shows a specific message', () => {
        authServiceSpy.isAuthenticated.mockReturnValue(false);

        const observer = {
            error: (_: any) => {
                expect(toastrSpy.error).toHaveBeenCalledWith(
                    'Interner Serverfehler!',
                    'HTTP 500 - Internal Server Error'
                );
            },
        };
        httpClient.get('/test').subscribe(observer);

        const mockReq = httpTestingController.expectOne('/test');
        mockReq.flush(null, { status: 500, statusText: 'Internal Server Error' });
        httpTestingController.verify();
    });

    it.each([502, 503])('http %i error (reverse proxy / gateway response) shows a server-unavailable message', (status) => {
        authServiceSpy.isAuthenticated.mockReturnValue(false);

        const observer = {
            error: (_: any) => {
                expect(toastrSpy.error).toHaveBeenCalledWith('Server nicht verfügbar!', `HTTP ${status} - Error`);
            },
        };
        httpClient.get('/test').subscribe(observer);

        const mockReq = httpTestingController.expectOne('/test');
        mockReq.flush(null, { status, statusText: 'Error' });
        httpTestingController.verify();
    });

    it('network-level error (no response reached the server) shows a connection message', () => {
        authServiceSpy.isAuthenticated.mockReturnValue(false);

        const observer = {
            error: (_: any) => {
                expect(toastrSpy.error).toHaveBeenCalledWith('Keine Verbindung zum Server!', 'HTTP 0 - Unknown Error');
            },
        };
        httpClient.get('/test').subscribe(observer);

        const mockReq = httpTestingController.expectOne('/test');
        mockReq.error(new ProgressEvent('error'));
        httpTestingController.verify();
    });

    it.each([400, 401, 404, 409])('shows a toast by default for status %i when not suppressed', (status) => {
        authServiceSpy.isAuthenticated.mockReturnValue(false);

        const observer = {
            error: (_: any) => {
                expect(toastrSpy.error).toHaveBeenCalled();
            },
        };
        httpClient.get('/test').subscribe(observer);

        const mockReq = httpTestingController.expectOne('/test');
        mockReq.flush(null, { status, statusText: 'Error' });
        httpTestingController.verify();
    });

    it('suppresses the toast when SUPPRESS_ERROR_TOAST context is set', () => {
        authServiceSpy.isAuthenticated.mockReturnValue(false);

        const observer = {
            error: (_: any) => {
                expect(toastrSpy.error).not.toHaveBeenCalled();
            },
        };
        httpClient.get('/test', { context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true) }).subscribe(observer);

        const mockReq = httpTestingController.expectOne('/test');
        mockReq.flush(null, { status: 400, statusText: 'Bad Request' });
        httpTestingController.verify();
    });

    it('generic http 504 error', () => {
        authServiceSpy.isAuthenticated.mockReturnValue(false);

        /* eslint-disable @typescript-eslint/no-unused-vars */
        const observer = {
            error: (error: any) => {
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
            error: (error: any) => {
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

    it('generic http 423 error', () => {
        authServiceSpy.isAuthenticated.mockReturnValue(false);

        /* eslint-disable @typescript-eslint/no-unused-vars */
        const observer = {
            error: (error: any) => {
                expect(toastrSpy.error).toHaveBeenCalledWith(
                    'Konto vorübergehend gesperrt!',
                    'HTTP 423 - Locked'
                );
            },
        };
        httpClient.get('/test').subscribe(observer);

        const mockReq = httpTestingController.expectOne('/test');
        const mockErrorResponse = { status: 423, statusText: 'Locked' };
        mockReq.flush(null, mockErrorResponse);
        httpTestingController.verify();
    });

    it('specific spring http error', () => {
        authServiceSpy.isAuthenticated.mockReturnValue(false);


        const observer = {
            error: (_: any) => {
                expect(toastrSpy.error).toHaveBeenCalledWith(
                    'Custom message from body',
                    'HTTP 403 - Error Code'
                );
            },
        };
        httpClient.get('/test').subscribe(observer);

        const mockReq = httpTestingController.expectOne('/test');
        const mockErrorResponse = {
            status: 403,
            statusText: 'Error Code'
        };

        const errorBody: ProblemDetail = {
            detail: 'Custom message from body'
        };
        mockReq.flush(errorBody, mockErrorResponse);
        httpTestingController.verify();
    });

    it('records every failure for a later support request, suppressed toast included', () => {
        authServiceSpy.isAuthenticated.mockReturnValue(false);
        const clientLogService = TestBed.inject(ClientLogService);

        const observer = {
            error: (_: any) => {
                expect(clientLogService.getEntries().map(entry => entry.message)).toEqual([
                    'HTTP 500 - GET /test: Interner Serverfehler!'
                ]);
            },
        };
        httpClient.get('/test', { context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true) }).subscribe(observer);

        const mockReq = httpTestingController.expectOne('/test');
        mockReq.flush(null, { status: 500, statusText: 'Internal Server Error' });
        httpTestingController.verify();
    });

    it('authentication expired and redirected to login', () => {
        authServiceSpy.isAuthenticated.mockReturnValue(true);


        const observer = {
            error: (_: any) => {
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
