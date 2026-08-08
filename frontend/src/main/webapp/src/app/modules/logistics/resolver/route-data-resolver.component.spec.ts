import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient, withXhr} from '@angular/common/http';
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
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: RouteApiService,
          useValue: {
            getActiveRoutes: vi.fn().mockName('RouteApiService.getActiveRoutes')
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
          number: 1,
          name: 'Route 1',
          enabled: true,
          stops: []
        },
        {
          id: 2,
          number: 2,
          name: 'Route 2',
          enabled: true,
          stops: []
        }
      ]
    };
    apiService.getActiveRoutes.mockReturnValue(of(mockRoutes));

    const activatedRoute = <ActivatedRouteSnapshot><unknown>{};
    resolver.resolve(activatedRoute).subscribe((routeList: RouteList) => {
      expect(routeList).toEqual(mockRoutes);
    });
  });

});
