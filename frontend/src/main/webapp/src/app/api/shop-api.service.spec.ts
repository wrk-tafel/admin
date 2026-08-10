import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {ShopApiService, ShopItem} from './shop-api.service';

describe('ShopApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: ShopApiService;

  const mockShop: ShopItem = {
    id: 1,
    number: 100,
    name: 'Billa',
    addressStreet: 'Teststraße 1',
    addressPostalCode: 1100,
    addressCity: 'Wien',
    foodUnit: 'BOX',
    phone: '01 234 56 78',
    contactPerson: 'Fr. Musterfrau',
    note: 'Notiz',
    enabled: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        ShopApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(ShopApiService);
  });

  it('get all shops', () => {
    apiService.getAllShops().subscribe();

    const req = httpMock.expectOne({method: 'GET', url: '/shops'});

    req.flush(null);
    httpMock.verify();
  });

  it('create shop', () => {
    apiService.createShop(mockShop).subscribe();

    const req = httpMock.expectOne({method: 'POST', url: '/shops'});
    expect(req.request.body).toEqual(mockShop);

    req.flush(null);
    httpMock.verify();
  });

  it('update shop', () => {
    apiService.updateShop(1, mockShop).subscribe();

    const req = httpMock.expectOne({method: 'PUT', url: '/shops/1'});
    expect(req.request.body).toEqual(mockShop);

    req.flush(null);
    httpMock.verify();
  });

});
