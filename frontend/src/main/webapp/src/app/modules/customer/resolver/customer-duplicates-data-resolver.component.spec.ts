import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { CustomerApiService, CustomerDuplicatesResponse } from '../../../api/customer-api.service';
import { of } from 'rxjs';
import { CustomerDataResolver } from './customerdata-resolver.component';
import { ActivatedRouteSnapshot } from '@angular/router';
import { CustomerDuplicatesDataResolver } from './customer-duplicates-data-resolver.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CustomerDuplicatesDataResolver', () => {
    let apiService: MockedObject<CustomerApiService>;
    let resolver: CustomerDuplicatesDataResolver;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: CustomerApiService,
                    useValue: {
                        getCustomerDuplicates: vi.fn().mockName("CustomerApiService.getCustomerDuplicates")
                    }
                },
                CustomerDataResolver
            ]
        });

        apiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
        resolver = TestBed.inject(CustomerDuplicatesDataResolver);
    });

    it('resolve', () => {
        const mockResponse: CustomerDuplicatesResponse = {
            items: [],
            currentPage: 1,
            pageSize: 10,
            totalCount: 100,
            totalPages: 10
        };
        apiService.getCustomerDuplicates.mockReturnValue(of(mockResponse));

        const activatedRoute = <ActivatedRouteSnapshot><unknown>{};
        resolver.resolve(activatedRoute).subscribe((response: CustomerDuplicatesResponse) => {
            expect(response).toEqual(mockResponse);
        });

        expect(apiService.getCustomerDuplicates).toHaveBeenCalled();
    });

});
