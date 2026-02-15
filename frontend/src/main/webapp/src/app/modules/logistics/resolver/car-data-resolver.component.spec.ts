import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {of} from 'rxjs';
import {ActivatedRouteSnapshot} from '@angular/router';
import {CarApiService, CarList} from '../../../api/car-api.service';
import {CarDataResolver} from './car-data-resolver.component';

describe('CarDataResolver', () => {
  let apiService: MockedObject<CarApiService>;
  let resolver: CarDataResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CarApiService,
          useValue: {
            getCars: vi.fn().mockName('CarApiService.getCars')
          }
        },
        CarDataResolver
      ]
    });

    apiService = TestBed.inject(CarApiService) as MockedObject<CarApiService>;
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
    apiService.getCars.mockReturnValue(of(mockCars));

    const activatedRoute = <ActivatedRouteSnapshot><unknown>{};
    resolver.resolve(activatedRoute).subscribe((carList: CarList) => {
      expect(carList).toEqual(mockCars);
    });
  });

});
