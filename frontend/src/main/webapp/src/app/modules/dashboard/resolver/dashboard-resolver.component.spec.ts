import {HttpClientTestingModule} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {DistributionApiService, DistributionStatesResponse} from '../../../api/distribution-api.service';
import {of} from 'rxjs';
import {DashboardResolver} from './dashboard-resolver.service';

describe('DashboardResolver', () => {
  let apiService: jasmine.SpyObj<DistributionApiService>;
  let resolver: DashboardResolver;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: DistributionApiService,
          useValue: jasmine.createSpyObj('DistributionApiService', ['getStates'])
        },
        DashboardResolver
      ]
    });

    apiService = TestBed.inject(DistributionApiService) as jasmine.SpyObj<DistributionApiService>;
    resolver = TestBed.inject(DashboardResolver);
  });

  it('resolve', () => {
    const mockObservable = of<DistributionStatesResponse>();
    apiService.getStates.and.returnValue(mockObservable);

    const result = resolver.resolve(undefined, undefined);

    expect(result).toEqual(mockObservable);
    expect(apiService.getStates).toHaveBeenCalled();
  });

});
