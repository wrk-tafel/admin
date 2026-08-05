import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DistributionApiService, DistributionListResponse } from '../../../api/distribution-api.service';
import { of } from 'rxjs';
import { ActivatedRouteSnapshot } from '@angular/router';
import { CustomerOverviewDistributionsResolver } from './customer-overview-distributions-resolver.component';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CustomerOverviewDistributionsResolver', () => {
    let apiService: MockedObject<DistributionApiService>;
    let resolver: CustomerOverviewDistributionsResolver;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                {
                    provide: DistributionApiService,
                    useValue: {
                        getDistributions: vi.fn().mockName('DistributionApiService.getDistributions')
                    }
                },
                CustomerOverviewDistributionsResolver
            ]
        });

        apiService = TestBed.inject(DistributionApiService) as MockedObject<DistributionApiService>;
        resolver = TestBed.inject(CustomerOverviewDistributionsResolver);
    });

    it('resolve', () => {
        const mockResponse: DistributionListResponse = {
            items: []
        };
        apiService.getDistributions.mockReturnValue(of(mockResponse));

        const activatedRoute = <ActivatedRouteSnapshot><unknown>{};
        resolver.resolve(activatedRoute).subscribe((response: DistributionListResponse) => {
            expect(response).toEqual(mockResponse);
        });

        expect(apiService.getDistributions).toHaveBeenCalled();
    });

});
