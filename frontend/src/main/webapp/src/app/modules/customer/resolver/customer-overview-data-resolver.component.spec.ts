import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CustomerApiService, CustomerOverviewResponse } from '../../../api/customer-api.service';
import { of } from 'rxjs';
import { ActivatedRouteSnapshot } from '@angular/router';
import { CustomerOverviewDataResolver } from './customer-overview-data-resolver.component';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CustomerOverviewDataResolver', () => {
    let apiService: MockedObject<CustomerApiService>;
    let resolver: CustomerOverviewDataResolver;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                {
                    provide: CustomerApiService,
                    useValue: {
                        getCustomersOverview: vi.fn().mockName('CustomerApiService.getCustomersOverview')
                    }
                },
                CustomerOverviewDataResolver
            ]
        });

        apiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
        resolver = TestBed.inject(CustomerOverviewDataResolver);
    });

    it('resolve', () => {
        const mockResponse: CustomerOverviewResponse = {
            distributionId: 100,
            newCustomers: [],
            renewedCustomers: []
        };
        apiService.getCustomersOverview.mockReturnValue(of(mockResponse));

        const activatedRoute = <ActivatedRouteSnapshot><unknown>{};
        resolver.resolve(activatedRoute).subscribe((response: CustomerOverviewResponse) => {
            expect(response).toEqual(mockResponse);
        });

        expect(apiService.getCustomersOverview).toHaveBeenCalled();
    });

});
