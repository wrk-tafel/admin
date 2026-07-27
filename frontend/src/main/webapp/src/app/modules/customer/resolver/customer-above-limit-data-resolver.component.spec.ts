import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CustomerAboveLimitItem, CustomerApiService } from '../../../api/customer-api.service';
import { of } from 'rxjs';
import { ActivatedRouteSnapshot } from '@angular/router';
import { CustomerAboveLimitDataResolver } from './customer-above-limit-data-resolver.component';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CustomerAboveLimitDataResolver', () => {
    let apiService: MockedObject<CustomerApiService>;
    let resolver: CustomerAboveLimitDataResolver;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                {
                    provide: CustomerApiService,
                    useValue: {
                        getCustomersAboveLimit: vi.fn().mockName('CustomerApiService.getCustomersAboveLimit')
                    }
                },
                CustomerAboveLimitDataResolver
            ]
        });

        apiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
        resolver = TestBed.inject(CustomerAboveLimitDataResolver);
    });

    it('resolve', () => {
        const mockResponse: CustomerAboveLimitItem[] = [];
        apiService.getCustomersAboveLimit.mockReturnValue(of(mockResponse));

        const activatedRoute = <ActivatedRouteSnapshot><unknown>{};
        resolver.resolve(activatedRoute).subscribe((response: CustomerAboveLimitItem[]) => {
            expect(response).toEqual(mockResponse);
        });

        expect(apiService.getCustomersAboveLimit).toHaveBeenCalled();
    });

});
