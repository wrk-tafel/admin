import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { CustomerApiService, CustomerData, Gender } from '../../../api/customer-api.service';
import moment from 'moment';
import { of } from 'rxjs';
import { CustomerDataResolver } from './customerdata-resolver.component';
import { ActivatedRouteSnapshot } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CustomerDataResolver', () => {
    let apiService: MockedObject<CustomerApiService>;
    let resolver: CustomerDataResolver;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: CustomerApiService,
                    useValue: {
                        getCustomer: vi.fn().mockName("CustomerApiService.getCustomer")
                    }
                },
                CustomerDataResolver
            ]
        });

        apiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
        resolver = TestBed.inject(CustomerDataResolver);
    });

    it('resolve', () => {
        const mockCustomer: CustomerData = {
            id: 133,
            issuer: {
                personnelNumber: '12345',
                firstname: 'first',
                lastname: 'last'
            },
            issuedAt: moment().startOf('day').utc().toDate(),
            lastname: 'Mustermann',
            firstname: 'Max',
            birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
            gender: Gender.MALE,
            telephoneNumber: '00436644123123123',
            email: 'max.mustermann@gmail.com',

            address: {
                street: 'Teststraße',
                houseNumber: '123A',
                stairway: '1',
                door: '21',
                postalCode: 1020,
                city: 'Wien',
            },

            employer: 'test employer',
            income: 1000,
            incomeDue: moment().add(1, 'years').startOf('day').utc().toDate(),

            validUntil: moment().add(1, 'years').startOf('day').utc().toDate(),

            additionalPersons: [
                {
                    key: 0,
                    id: 0,
                    lastname: 'Add',
                    firstname: 'Pers 1',
                    birthDate: moment().subtract(5, 'years').startOf('day').utc().toDate(),
                    gender: Gender.FEMALE,
                    income: 50,
                    incomeDue: moment().add(1, 'years').startOf('day').utc().toDate(),
                    excludeFromHousehold: false,
                    receivesFamilyBonus: true
                }
            ]
        };
        apiService.getCustomer.mockImplementation((id) =>
            id === mockCustomer.id ? of(mockCustomer) : of(mockCustomer)
        );

        const activatedRoute = <ActivatedRouteSnapshot><unknown>{ params: { id: mockCustomer.id } };
        resolver.resolve(activatedRoute).subscribe((customer: CustomerData) => {
            expect(customer).toEqual(mockCustomer);
        });

        expect(apiService.getCustomer).toHaveBeenCalledWith(mockCustomer.id);
    });

});
