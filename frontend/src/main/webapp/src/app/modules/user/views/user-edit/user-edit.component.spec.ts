import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { UserEditComponent } from './user-edit.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { UserApiService, UserData } from '../../../../api/user-api.service';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TafelToastrService } from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('UserEditComponent', () => {
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

    describe('Creating a new user', () => {
        let apiService: MockedObject<UserApiService>;
        let router: MockedObject<Router>;

        beforeEach(() => {
            TestBed.configureTestingModule({
                imports: [
                    NoopAnimationsModule,
                    ReactiveFormsModule
                ],
                providers: [
                    provideHttpClient(withXhr()),
                    provideHttpClientTesting(),
                    {
                        provide: UserApiService,
                        useValue: {
                            createUser: vi.fn().mockName('UserApiService.createUser'),
                            updateUser: vi.fn().mockName('UserApiService.updateUser')
                        }
                    },
                    {
                        provide: Router,
                        useValue: {
                            navigate: vi.fn().mockName('Router.navigate')
                        }
                    },
                    {
                        provide: TafelToastrService,
                        useValue: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn(), show: vi.fn() }
                    }
                ]
            }).compileComponents();

            apiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
            router = TestBed.inject(Router) as MockedObject<Router>;
        });

        it('new user saved successfully', () => {
            const userFormComponentMock = {
                markAllAsTouched: vi.fn().mockName('UserFormComponent.markAllAsTouched'),
                isValid: vi.fn().mockName('UserFormComponent.isValid')
            };
            userFormComponentMock.isValid.mockReturnValue(true);
            apiService.createUser.mockReturnValue(of(mockUser));

            const fixture = TestBed.createComponent(UserEditComponent);
            const component = fixture.componentInstance;
            Object.defineProperty(component, 'userFormComponent', {
                get: () => () => userFormComponentMock
            });
            component.userUpdated.set(mockUser);

            component.save();

            expect(component.isSaveEnabled()).toBe(true);
            expect(userFormComponentMock.markAllAsTouched).toHaveBeenCalled();
            expect(apiService.createUser).toHaveBeenCalledWith(expect.objectContaining(mockUser), expect.anything());
            expect(router.navigate).toHaveBeenCalledWith(['/benutzer/detail', mockUser.id]);
        });
    });

    describe('Editing an existing user', () => {
        const mockPermissions = [
            {key: 'PERM1', title: 'Permission 1', category: 'Category 1'},
            {key: 'PERM2', title: 'Permission 2', category: 'Category 1'}
        ];

        let apiService: MockedObject<UserApiService>;
        let router: MockedObject<Router>;

        beforeEach(() => {
            TestBed.configureTestingModule({
                imports: [
                    ReactiveFormsModule,
                    NoopAnimationsModule
                ],
                providers: [
                    provideHttpClient(withXhr()),
                    provideHttpClientTesting(),
                    {
                        provide: UserApiService,
                        useValue: {
                            updateUser: vi.fn().mockName('UserApiService.updateUser')
                        }
                    },
                    {
                        provide: Router,
                        useValue: {
                            navigate: vi.fn().mockName('Router.navigate')
                        }
                    },
                    {
                        provide: TafelToastrService,
                        useValue: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn(), show: vi.fn() }
                    }
                ]
            }).compileComponents();

            apiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
            router = TestBed.inject(Router) as MockedObject<Router>;
        });

        it('existing user saved successfully', () => {
            apiService.updateUser.mockReturnValue(of(mockUser));

            const fixture = TestBed.createComponent(UserEditComponent);
            const component = fixture.componentInstance;

            const userFormComponentMock = { isValid: vi.fn().mockReturnValue(true), markAllAsTouched: vi.fn() };
            Object.defineProperty(component, 'userFormComponent', {
                get: () => () => userFormComponentMock
            });

            fixture.componentRef.setInput('permissionsData', mockPermissions);
            fixture.componentRef.setInput('userData', mockUser);

            component.save();

            expect(component.userData()).toEqual(mockUser);
            expect(apiService.updateUser).toHaveBeenCalledWith(expect.objectContaining(mockUser), expect.anything());
            expect(router.navigate).toHaveBeenCalledWith(['/benutzer/detail', mockUser.id]);
        });
    });

});
