import {HttpClient, provideHttpClient, withInterceptors} from '@angular/common/http';
import {TestBed} from '@angular/core/testing';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {errorHandlerInterceptor, TafelErrorResponse} from './errorhandler-interceptor.service';
import {AuthenticationService} from '../security/authentication.service';
import {ToastOptions, ToastService, ToastType} from '../views/default-layout/toasts/toast.service';

describe('ErrorHandlerInterceptor', () => {
  let httpTestingController: HttpTestingController;
  let httpClient: HttpClient;
  let authServiceSpy: jasmine.SpyObj<AuthenticationService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([errorHandlerInterceptor])
        ),
        provideHttpClientTesting(),
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

    httpTestingController = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    authServiceSpy = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
    toastServiceSpy = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
  });

  afterEach(() => {
    httpTestingController.verify();
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
    httpClient.get('/test').subscribe(observer);

    const mockReq = httpTestingController.expectOne('/test');
    const mockErrorResponse = {status: 500, statusText: 'Internal Server Error'};
    mockReq.flush(null, mockErrorResponse);
    httpTestingController.verify();
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
    httpClient.get('/test').subscribe(observer);

    const mockReq = httpTestingController.expectOne('/test');
    const mockErrorResponse = {status: 504, statusText: 'Bad Gateway'};
    mockReq.flush(null, mockErrorResponse);
    httpTestingController.verify();
  });

  it('specific spring http error', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const observer = {
      error: _ => {
        const expectedToast: ToastOptions = {
          type: ToastType.ERROR,
          title: 'HTTP 400 - Bad Request',
          message: 'Custom message from body'
        };
        expect(toastServiceSpy.showToast).toHaveBeenCalledWith(expectedToast);
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
    authServiceSpy.isAuthenticated.and.returnValue(true);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    const observer = {
      error: _ => {
        expect(authServiceSpy.redirectToLogin).toHaveBeenCalled();
      },
    };
    httpClient.get('/test').subscribe(observer);

    const mockReq = httpTestingController.expectOne('/test');
    const mockErrorResponse = {status: 401, statusText: 'Unauthorized'};
    mockReq.flush(null, mockErrorResponse);
    httpTestingController.verify();
  });

});
