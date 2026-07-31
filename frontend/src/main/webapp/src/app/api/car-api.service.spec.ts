import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {CarApiService, CarList} from './car-api.service';

describe('CarApiService', () => {
  let httpMock: HttpTestingController;
  let apiService: CarApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        CarApiService
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    apiService = TestBed.inject(CarApiService);
  });

  it('get active cars', () => {
    const testResponse: CarList = {
      cars: [
        {id: 1, licensePlate: '123', name: 'Car 123', enabled: true, sortOrder: 1},
        {id: 2, licensePlate: '456', name: 'Car 456', enabled: true, sortOrder: 2}
      ]
    };

    apiService.getActiveCars().subscribe((data: CarList) => {
      expect(data).toEqual(testResponse);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/cars/active'});
    req.flush(testResponse);
    httpMock.verify();
  });

  it('get all cars', () => {
    const testResponse: CarList = {
      cars: [
        {id: 1, licensePlate: '123', name: 'Car 123', enabled: true, sortOrder: 1},
        {id: 2, licensePlate: '456', name: 'Car 456', enabled: false, sortOrder: 2}
      ]
    };

    apiService.getAllCars().subscribe((data: CarList) => {
      expect(data).toEqual(testResponse);
    });

    const req = httpMock.expectOne({method: 'GET', url: '/cars'});
    req.flush(testResponse);
    httpMock.verify();
  });

  it('create car', () => {
    const newCar = {id: 0, licensePlate: 'New Plate', name: 'New Car', enabled: true, sortOrder: 0};

    apiService.createCar(newCar).subscribe((data) => {
      expect(data).toEqual(newCar);
    });

    const req = httpMock.expectOne({method: 'POST', url: '/cars'});
    req.flush(newCar);
    httpMock.verify();
  });

  it('update car', () => {
    const updatedCar = {id: 1, licensePlate: 'Updated Plate', name: 'Updated Car', enabled: false, sortOrder: 1};

    apiService.updateCar(1, updatedCar).subscribe((data) => {
      expect(data).toEqual(updatedCar);
    });

    const req = httpMock.expectOne({method: 'PUT', url: '/cars/1'});
    req.flush(updatedCar);
    httpMock.verify();
  });

  it('reorder cars', () => {
    const testResponse: CarList = {
      cars: [
        {id: 2, licensePlate: '456', name: 'Car 456', enabled: true, sortOrder: 1},
        {id: 1, licensePlate: '123', name: 'Car 123', enabled: true, sortOrder: 2}
      ]
    };

    apiService.reorderCars([2, 1]).subscribe((data: CarList) => {
      expect(data).toEqual(testResponse);
    });

    const req = httpMock.expectOne({method: 'POST', url: '/cars/reorder'});
    expect(req.request.body).toEqual({carIds: [2, 1]});
    req.flush(testResponse);
    httpMock.verify();
  });

});
