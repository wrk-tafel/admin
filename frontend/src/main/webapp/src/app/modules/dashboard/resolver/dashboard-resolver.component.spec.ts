import {HttpClientTestingModule} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {DistributionApiService} from '../../../api/distribution-api.service';
import {EMPTY} from 'rxjs';
import {DashboardResolver} from './dashboard-resolver.component';

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
    apiService.getStates.and.returnValue(EMPTY);

    const result = resolver.resolve(undefined, undefined);

    expect(result).toEqual(EMPTY);
    expect(apiService.getStates).toHaveBeenCalled();
  });

});
