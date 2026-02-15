import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {RouteApiService, RouteList} from '../../../api/route-api.service';
import {RouteDataResolver} from './route-data-resolver.component';
import {of} from 'rxjs';
import {ActivatedRouteSnapshot} from '@angular/router';

describe('RouteDataResolver', () => {
  let apiService: MockedObject<RouteApiService>;
  let resolver: RouteDataResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: RouteApiService,
          useValue: {
            getRoutes: vi.fn().mockName('RouteApiService.getRoutes')
          }
        },
        RouteDataResolver
      ]
    });

    apiService = TestBed.inject(RouteApiService) as MockedObject<RouteApiService>;
    resolver = TestBed.inject(RouteDataResolver);
  });

  it('resolve', () => {
    const mockRoutes: RouteList = {
      routes: [
        {
          id: 1,
          name: 'Route 1',
        },
        {
          id: 2,
          name: 'Route 2',
        }
      ]
    };
    apiService.getRoutes.mockReturnValue(of(mockRoutes));

    const activatedRoute = <ActivatedRouteSnapshot><unknown>{};
    resolver.resolve(activatedRoute).subscribe((routeList: RouteList) => {
      expect(routeList).toEqual(mockRoutes);
    });
  });

});
