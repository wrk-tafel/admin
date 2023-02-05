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
    urlHelperSpy.getBaseUrl.and.returnValue('http://test:1234');

    client.get('/test').subscribe();

    httpMock.expectOne('http://test:1234/api/test');
    expect().nothing();
  });

  it('should add the api path with base root and with subpath', () => {
    const client = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);
    urlHelperSpy.getBaseUrl.and.returnValue('http://test:1234/subpath');

    client.get('/test').subscribe();

    httpMock.expectOne('http://test:1234/subpath/api/test');
    expect().nothing();
  });

});
