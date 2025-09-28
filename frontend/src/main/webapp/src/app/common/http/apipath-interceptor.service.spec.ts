import {HttpClient, provideHttpClient, withInterceptors} from '@angular/common/http';
import {TestBed} from '@angular/core/testing';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {apiPathInterceptor} from './apipath-interceptor.service';
import {UrlHelperService} from '../util/url-helper.service';
import {provideZonelessChangeDetection} from "@angular/core";

describe('ApiPathInterceptor', () => {
  let httpTestingController: HttpTestingController;
  let httpClient: HttpClient;
  let urlHelperSpy: jasmine.SpyObj<UrlHelperService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(
          withInterceptors([apiPathInterceptor])
        ),
        provideHttpClientTesting(),
        {
          provide: UrlHelperService,
          useValue: jasmine.createSpyObj('UrlHelperService', ['getBaseUrl'])
        }
      ],
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    urlHelperSpy = TestBed.inject(UrlHelperService) as jasmine.SpyObj<UrlHelperService>;
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should add the api path with base root without subpath', () => {
    urlHelperSpy.getBaseUrl.and.returnValue('http://test:1234');

    httpClient.get('/test').subscribe();

    httpTestingController.expectOne('http://test:1234/api/test');
  });

  it('should add the api path with base root and with subpath', () => {
    urlHelperSpy.getBaseUrl.and.returnValue('http://test:1234/subpath');

    httpClient.get('/test').subscribe();

    httpTestingController.expectOne('http://test:1234/subpath/api/test');
  });

});
