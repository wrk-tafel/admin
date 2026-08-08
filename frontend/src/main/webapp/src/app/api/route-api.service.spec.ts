import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {RouteApiService, RouteData} from './route-api.service';

describe('RouteApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: RouteApiService;

  const mockRoute: RouteData = {
    id: 1,
    number: 1,
    name: 'Route 1',
    note: 'Note 1',
    enabled: true,
    stops: [{id: 11, time: '14:00', shopId: 2, description: 'Stopp 1'}]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        RouteApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(RouteApiService);
  });

  it('get active routes', () => {
    apiService.getActiveRoutes().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/routes/active'});

    req.flush(null);
    httpMock.verify();
  });

  it('get all routes', () => {
    apiService.getAllRoutes().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/routes'});

    req.flush(null);
    httpMock.verify();
  });

  it('create route', () => {
    apiService.createRoute(mockRoute).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/routes'});
    expect(req.request.body).toEqual(mockRoute);

    req.flush(null);
    httpMock.verify();
  });

  it('update route', () => {
    apiService.updateRoute(1, mockRoute).subscribe();

    const req = httpMock.expectOne({method: 'PUT', url: '/routes/1'});
    expect(req.request.body).toEqual(mockRoute);

    req.flush(null);
    httpMock.verify();
  });

  it('get shops of route', () => {
    apiService.getShopsOfRoute(1).subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/routes/1/shops'});

    req.flush(null);
    httpMock.verify();
  });

});
