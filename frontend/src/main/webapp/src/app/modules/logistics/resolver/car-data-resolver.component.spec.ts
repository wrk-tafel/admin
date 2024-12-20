import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {of} from 'rxjs';
import {ActivatedRouteSnapshot} from '@angular/router';
import {CarApiService, CarList} from '../../../api/car-api.service';
import {CarDataResolver} from './car-data-resolver.component';

describe('CarDataResolver', () => {
  let apiService: jasmine.SpyObj<CarApiService>;
  let resolver: CarDataResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CarApiService,
          useValue: jasmine.createSpyObj('CarApiService', ['getCars'])
        },
        CarDataResolver
      ]
    });

    apiService = TestBed.inject(CarApiService) as jasmine.SpyObj<CarApiService>;
    resolver = TestBed.inject(CarDataResolver);
  });

  it('resolve', () => {
    const mockCars: CarList = {
      cars: [
        {
          id: 1,
          licensePlate: '123',
          name: 'Car 123',
        },
        {
          id: 1,
          licensePlate: '456',
          name: 'Car 456',
        }
      ]
    };
    apiService.getCars.and.returnValue(of(mockCars));

    const activatedRoute = <ActivatedRouteSnapshot><unknown>{};
    resolver.resolve(activatedRoute).subscribe((carList: CarList) => {
      expect(carList).toEqual(mockCars);
    });
  });

});
