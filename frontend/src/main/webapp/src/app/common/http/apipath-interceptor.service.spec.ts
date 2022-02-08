import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ApiPathInterceptor } from './apipath-interceptor.service';

describe('ApiPathInterceptor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ApiPathInterceptor,
        {
          provide: HTTP_INTERCEPTORS,
          useClass: ApiPathInterceptor,
          multi: true
        }
      ],
    });
  });

  it('should add the api path when under rootpath', () => {
    TestBed.overrideProvider(Window, { useValue: { location: { pathname: '/' } } });
    const client = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    client.get('/test').subscribe();

    httpMock.expectOne('/api/test');
    expect().nothing();
  });

  it('should add the api path when under subpath', () => {
    TestBed.overrideProvider(Window, { useValue: { location: { pathname: '/mypath/' } } });
    const client = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);

    client.get('/test').subscribe();

    httpMock.expectOne('/mypath/api/test');
    expect().nothing();
  });

});
