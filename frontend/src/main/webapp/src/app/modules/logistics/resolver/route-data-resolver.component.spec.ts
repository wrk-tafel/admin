import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {RouteApiService, RouteList} from '../../../api/route-api.service';
import {RouteDataResolver} from './route-data-resolver.component';
import {of} from 'rxjs';
import {ActivatedRouteSnapshot} from '@angular/router';

describe('RouteDataResolver', () => {
  let apiService: jasmine.SpyObj<RouteApiService>;
  let resolver: RouteDataResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: RouteApiService,
          useValue: jasmine.createSpyObj('RouteApiService', ['getRoutes'])
        },
        RouteDataResolver
      ]
    });

    apiService = TestBed.inject(RouteApiService) as jasmine.SpyObj<RouteApiService>;
    resolver = TestBed.inject(RouteDataResolver);
  });

  it('resolve', () => {
    const mockRoutes: RouteList = {
      routes: [
        {
          id: 1,
          name: 'Route 1',
          shops: [
            {
              id: 1,
              number: 111,
              name: 'Shop 1'
            },
            {
              id: 2,
              number: 222,
              name: 'Shop 2'
            }
          ]
        },
        {
          id: 2,
          name: 'Route 2',
          shops: []
        }
      ]
    };
    apiService.getRoutes.and.returnValue(of(mockRoutes));

    const activatedRoute = <ActivatedRouteSnapshot><unknown>{};
    resolver.resolve(activatedRoute).subscribe((routeList: RouteList) => {
      expect(routeList).toEqual(mockRoutes);
    });
  });

});
