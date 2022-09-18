import {HTTP_INTERCEPTORS, HttpClient} from '@angular/common/http';
import {TestBed} from '@angular/core/testing';
import {HttpClientTestingModule, HttpTestingController,} from '@angular/common/http/testing';
import {ApiPathInterceptor} from './apipath-interceptor.service';
import {Router} from '@angular/router';

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

  it('should add the api path when base is root and no subpath', () => {
    TestBed.overrideProvider(Window, {useValue: {location: {pathname: '/'}}});
    const routerSpy = jasmine.createSpyObj('Router', ['url']);
    TestBed.overrideProvider(Router, {useValue: routerSpy});
    const client = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);
    routerSpy.url.and.returnValue('/');

    client.get('/test').subscribe();

    httpMock.expectOne('/api/test');
    expect().nothing();
  });

  it('should add the api path when base is root and with further subpath', () => {
    TestBed.overrideProvider(Window, {useValue: {location: {pathname: '/'}}});
    const routerSpy = jasmine.createSpyObj('Router', ['url']);
    TestBed.overrideProvider(Router, {useValue: routerSpy});
    const client = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);
    routerSpy.url.and.returnValue('/subpath');

    client.get('/test').subscribe();

    httpMock.expectOne('/api/test');
    expect().nothing();
  });

  it('should add the api path when base is subpath and no further subpath', () => {
    TestBed.overrideProvider(Window, {useValue: {location: {pathname: '/subpath'}}});
    const routerSpy = jasmine.createSpyObj('Router', ['url']);
    TestBed.overrideProvider(Router, {useValue: routerSpy});
    const client = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);
    routerSpy.url.and.returnValue('/');

    client.get('/test').subscribe();

    httpMock.expectOne('/subpath/api/test');
    expect().nothing();
  });

  it('should add the api path when base is subpath and further subpath', () => {
    TestBed.overrideProvider(Window, {useValue: {location: {pathname: '/subpath'}}});
    const routerSpy = jasmine.createSpyObj('Router', ['url']);
    TestBed.overrideProvider(Router, {useValue: routerSpy});
    const client = TestBed.inject(HttpClient);
    const httpMock = TestBed.inject(HttpTestingController);
    routerSpy.url.and.returnValue('/subpath2');

    client.get('/test').subscribe();

    httpMock.expectOne('/subpath/api/test');
    expect().nothing();
  });

});
