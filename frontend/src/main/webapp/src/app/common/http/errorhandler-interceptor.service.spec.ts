import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ErrorHandlerInterceptor } from './errorhandler-interceptor.service';
import expect from 'jasmine-core';

describe('ErrorHandlerInterceptor', () => {
  let client: HttpClient;
  let httpMock: HttpTestingController;
  let window: jasmine.SpyObj<Window>;

  beforeEach(() => {
    const windowSpy = jasmine.createSpyObj('window', ['alert']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: ErrorHandlerInterceptor,
          multi: true
        },
        {
          provide: Window,
          useValue: windowSpy
        }
      ]
    });

    client = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    window = TestBed.inject(Window) as jasmine.SpyObj<Window>;
  });

  it('generic http error', () => {
    client.get('/test').subscribe(() => { }, err => {
      expect(window.alert).toHaveBeenCalledWith('FEHLER:\nHTTP - 500 - Internal Server Error\nMESSAGE:\nHttp failure response for /test: 500 Internal Server Error\nDETAILS:\nundefined');
    });

    const mockReq = httpMock.expectOne('/test');
    const mockErrorResponse = { status: 500, statusText: 'Internal Server Error' };
    mockReq.flush(null, mockErrorResponse);
    httpMock.verify();
  });

  it('specific spring http error', () => {
    client.get('/test').subscribe(() => { }, err => {
      expect(window.alert).toHaveBeenCalledWith('FEHLER:\nHTTP - 400 - Bad Request\nMESSAGE:\nHttp failure response for /test: 400 Bad Request\nDETAILS:\ndetail-message');
    });

    const mockReq = httpMock.expectOne('/test');
    const mockErrorResponse = { status: 400, statusText: 'Bad Request' };
    mockReq.flush({ message: 'detail-message' }, mockErrorResponse);
    httpMock.verify();
  });

  // TODO CHECK
  it('no handling for status 404', () => {
    client.get('/test').subscribe(() => { }, err => {
      expect(window.alert).toHaveBeenCalledTimes(0);
    });

    const mockReq = httpMock.expectOne('/test');
    const mockErrorResponse = { status: 404, statusText: 'Not Found' };
    mockReq.flush(null, mockErrorResponse);
    httpMock.verify();
  });

});
