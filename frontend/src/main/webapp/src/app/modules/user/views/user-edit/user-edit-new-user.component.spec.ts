import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { UserEditComponent } from './user-edit.component';
import { BgColorDirective, CardModule, ColComponent, InputGroupComponent, ModalModule, RowComponent } from '@coreui/angular';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { UserApiService, UserData } from '../../../../api/user-api.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('UserEditComponent - Creating a new user', () => {
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

    let apiService: MockedObject<UserApiService>;
    let router: MockedObject<Router>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                ReactiveFormsModule,
                ModalModule,
                InputGroupComponent,
                CardModule,
                RowComponent,
                ColComponent,
                BgColorDirective
            ],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: UserApiService,
                    useValue: {
                        createUser: vi.fn().mockName("UserApiService.createUser"),
                        updateUser: vi.fn().mockName("UserApiService.updateUser")
                    }
                },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            data: {}
                        }
                    }
                },
                {
                    provide: Router,
                    useValue: {
                        navigate: vi.fn().mockName("Router.navigate")
                    }
                }
            ]
        }).compileComponents();

        apiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
        router = TestBed.inject(Router) as MockedObject<Router>;
    });

    it('new user saved successfully', () => {
        const userFormComponentMock = {
            markAllAsTouched: vi.fn().mockName("UserFormComponent.markAllAsTouched"),
            isValid: vi.fn().mockName("UserFormComponent.isValid")
        };
        userFormComponentMock.isValid.mockReturnValue(true);
        apiService.createUser.mockReturnValue(of(mockUser));

        const fixture = TestBed.createComponent(UserEditComponent);
        const component = fixture.componentInstance;
        Object.defineProperty(component, 'userFormComponent', {
            get: () => () => userFormComponentMock
        });
        component.userUpdated = mockUser;

        component.save();

        expect(component.isSaveEnabled()).toBe(true);
        expect(userFormComponentMock.markAllAsTouched).toHaveBeenCalled();
        expect(apiService.createUser).toHaveBeenCalledWith(expect.objectContaining(mockUser));
        expect(router.navigate).toHaveBeenCalledWith(['/benutzer/detail', mockUser.id]);
    });

});
