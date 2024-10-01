import {HTTP_INTERCEPTORS, HttpClient} from '@angular/common/http';
import {TestBed} from '@angular/core/testing';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {ErrorHandlerInterceptor, TafelErrorResponse} from './errorhandler-interceptor.service';
import {AuthenticationService} from '../security/authentication.service';
import {ToastOptions, ToastService, ToastType} from '../views/default-layout/toasts/toast.service';

describe('ErrorHandlerInterceptor', () => {
  let client: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthenticationService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: ErrorHandlerInterceptor,
          multi: true
        },
        {
          provide: AuthenticationService,
          useValue: jasmine.createSpyObj('AuthenticationService', ['redirectToLogin', 'isAuthenticated'])
        },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj('ToastService', ['showToast'])
        }
      ]
    });

    client = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authServiceSpy = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
    toastServiceSpy = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
  });

  it('generic http error', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const observer = {
      error: error => {
        const expectedToast: ToastOptions = {
          type: ToastType.ERROR,
          title: 'HTTP 500 - Internal Server Error',
          message: 'Http failure response for /test: 500 Internal Server Error'
        };
        expect(toastServiceSpy.showToast).toHaveBeenCalledWith(expectedToast);
      },
    };
    client.get('/test').subscribe(observer);

    const mockReq = httpMock.expectOne('/test');
    const mockErrorResponse = {status: 500, statusText: 'Internal Server Error'};
    mockReq.flush(null, mockErrorResponse);
    httpMock.verify();
  });

  it('generic http 504 error', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const observer = {
      error: error => {
        const expectedToast: ToastOptions = {
          type: ToastType.ERROR,
          title: 'HTTP 504 - Bad Gateway',
          message: 'Server nicht verfügbar!'
        };
        expect(toastServiceSpy.showToast).toHaveBeenCalledWith(expectedToast);
      },
    };
    client.get('/test').subscribe(observer);

    const mockReq = httpMock.expectOne('/test');
    const mockErrorResponse = {status: 504, statusText: 'Bad Gateway'};
    mockReq.flush(null, mockErrorResponse);
    httpMock.verify();
  });

  it('specific spring http error', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const observer = {
      error: error => {
        const expectedToast: ToastOptions = {
          type: ToastType.ERROR,
          title: 'HTTP 400 - Bad Request',
          message: 'Custom message from body'
        };
        expect(toastServiceSpy.showToast).toHaveBeenCalledWith(expectedToast);
      },
    };
    client.get('/test').subscribe(observer);

    const mockReq = httpMock.expectOne('/test');
    const mockErrorResponse = {
      status: 400,
      statusText: 'Bad Request'
    };

    const errorBody: TafelErrorResponse = {
      message: 'Custom message from body'
    };
    mockReq.flush(errorBody, mockErrorResponse);
    httpMock.verify();
  });

  it('authentication expired and redirected to login', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const observer = {
      error: error => {
        expect(authServiceSpy.redirectToLogin).toHaveBeenCalled();
      },
    };
    client.get('/test').subscribe(observer);

    const mockReq = httpMock.expectOne('/test');
    const mockErrorResponse = {status: 401, statusText: 'Unauthorized'};
    mockReq.flush(null, mockErrorResponse);
    httpMock.verify();
  });

});
