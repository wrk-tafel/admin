import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UserDataResolver } from './userdata-resolver.component';
import { ActivatedRouteSnapshot } from '@angular/router';
import { UserApiService, UserData } from '../../../api/user-api.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('UserDataResolver', () => {
    let apiService: MockedObject<UserApiService>;
    let resolver: UserDataResolver;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: UserApiService,
                    useValue: {
                        getUserForId: vi.fn().mockName("UserApiService.getUserForId")
                    }
                },
                UserDataResolver
            ]
        });

        apiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
        resolver = TestBed.inject(UserDataResolver);
    });

    it('resolve', () => {
        const mockUser: UserData = {
            id: 0,
            personnelNumber: '0000',
            username: 'username',
            firstname: 'first',
            lastname: 'last',
            enabled: true,
            passwordChangeRequired: true,
            permissions: []
        };
        apiService.getUserForId.mockImplementation((id) =>
            id === mockUser.id ? of(mockUser) : of(mockUser)
        );

        const activatedRoute = <ActivatedRouteSnapshot><unknown>{ params: { id: mockUser.id } };
        resolver.resolve(activatedRoute).subscribe((user: UserData) => {
            expect(user).toEqual(mockUser);
        });

        expect(apiService.getUserForId).toHaveBeenCalledWith(mockUser.id);
    });

});
