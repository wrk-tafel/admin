import {HTTP_INTERCEPTORS, HttpClient} from '@angular/common/http';
import {TestBed} from '@angular/core/testing';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {ApiPathInterceptor} from './apipath-interceptor.service';
import {UrlHelperService} from '../util/url-helper.service';

describe('ApiPathInterceptor', () => {
  let urlHelperSpy: jasmine.SpyObj<UrlHelperService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ApiPathInterceptor,
        {
          provide: HTTP_INTERCEPTORS,
          useClass: ApiPathInterceptor,
          multi: true
        },
        {
          provide: UrlHelperService,
          useValue: jasmine.createSpyObj('UrlHelperService', ['getBaseUrl'])
        }
      ],
    });

    urlHelperSpy = TestBed.inject(UrlHelperService) as jasmine.SpyObj<UrlHelperService>;
  });

  it('should add the api path with base root without subpath', () => {
    const client = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);
    urlHelperSpy.getBaseUrl.and.returnValue('/');

    client.get('/test').subscribe();

    httpMock.expectOne('/api/test');
    expect().nothing();
  });

  it('should add the api path with base root and with further subpath', () => {
    const client = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);
    urlHelperSpy.getBaseUrl.and.returnValue('/subpath');

    client.get('/test').subscribe();

    httpMock.expectOne('/subpath/api/test');
    expect().nothing();
  });

  it('should add the api path with subpath and trailing end', () => {
    const client = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);
    urlHelperSpy.getBaseUrl.and.returnValue('/subpath3/');

    client.get('/test').subscribe();

    httpMock.expectOne('/subpath3/api/test');
    expect().nothing();
  });

});
