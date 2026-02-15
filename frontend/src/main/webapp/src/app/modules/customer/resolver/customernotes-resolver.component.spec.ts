import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import moment from 'moment';
import { of } from 'rxjs';
import { ActivatedRouteSnapshot } from '@angular/router';
import { CustomerNotesResolver } from './customernotes-resolver.component';
import { CustomerNoteApiService, CustomerNotesResponse } from '../../../api/customer-note-api.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CustomerNotesResolver', () => {
    let apiService: MockedObject<CustomerNoteApiService>;
    let resolver: CustomerNotesResolver;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: CustomerNoteApiService,
                    useValue: {
                        getNotesForCustomer: vi.fn().mockName("CustomerNoteApiService.getNotesForCustomer")
                    }
                },
                CustomerNotesResolver
            ]
        });

        apiService = TestBed.inject(CustomerNoteApiService) as MockedObject<CustomerNoteApiService>;
        resolver = TestBed.inject(CustomerNotesResolver);
    });

    it('resolve', () => {
        const customerId = 123;
        const mockNotesResponse: CustomerNotesResponse = {
            items: [
                {
                    author: 'author1',
                    timestamp: moment().subtract(1, 'hour').toDate(),
                    note: 'note from author 1'
                },
                {
                    author: 'author2',
                    timestamp: moment().subtract(2, 'hour').toDate(),
                    note: 'note from author 2'
                }
            ],
            totalCount: 1,
            currentPage: 0,
            totalPages: 1,
            pageSize: 5
        };
        apiService.getNotesForCustomer.mockImplementation((id) =>
            id === customerId ? of(mockNotesResponse) : of(mockNotesResponse)
        );

        const activatedRoute = <ActivatedRouteSnapshot><unknown>{ params: { id: customerId } };
        resolver.resolve(activatedRoute).subscribe((response: CustomerNotesResponse) => {
            expect(response).toEqual(mockNotesResponse);
        });

        expect(apiService.getNotesForCustomer).toHaveBeenCalledWith(customerId);
    });

});
