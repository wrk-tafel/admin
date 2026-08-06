import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {PushApiService} from './push-api.service';

describe('PushApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: PushApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        PushApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(PushApiService);
  });

  it('getPublicKey', () => {
    apiService.getPublicKey().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/push/public-key'});
    req.flush({publicKey: 'public-key'});
    httpMock.verify();
  });

  it('getSubscriptions', () => {
    apiService.getSubscriptions().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/push/subscriptions'});
    req.flush({items: []});
    httpMock.verify();
  });

  it('createSubscription', () => {
    const request = {endpoint: 'https://push.example.com/x', p256dhKey: 'p', authKey: 'a'};

    apiService.createSubscription(request).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/push/subscriptions'});
    req.flush({id: 1, endpoint: request.endpoint});
    httpMock.verify();

    expect(req.request.body).toEqual(request);
  });

  it('deleteSubscription', () => {
    apiService.deleteSubscription(1).subscribe();

    const req = httpMock.expectOne({method: 'DELETE', url: '/push/subscriptions/1'});
    req.flush(null);
    httpMock.verify();
  });

});
