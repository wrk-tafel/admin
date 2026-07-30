import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
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
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: CarApiService,
          useValue: {
            getActiveCars: vi.fn().mockName('CarApiService.getActiveCars')
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
          enabled: true,
          sortOrder: 1,
        },
        {
          id: 1,
          licensePlate: '456',
          name: 'Car 456',
          enabled: true,
          sortOrder: 2,
        }
      ]
    };
    apiService.getActiveCars.mockReturnValue(of(mockCars));

    const activatedRoute = <ActivatedRouteSnapshot><unknown>{};
    resolver.resolve(activatedRoute).subscribe((carList: CarList) => {
      expect(carList).toEqual(mockCars);
    });
  });

});
