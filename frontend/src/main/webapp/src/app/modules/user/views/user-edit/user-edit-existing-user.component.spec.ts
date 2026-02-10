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

describe('UserEditComponent - Editing an existing user', () => {
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

    let router: MockedObject<Router>;
    let apiService: MockedObject<UserApiService>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                ReactiveFormsModule,
                ModalModule,
                NoopAnimationsModule,
                CardModule,
                InputGroupComponent,
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
                        updateUser: vi.fn().mockName("UserApiService.updateUser")
                    }
                },
                {
                    provide: Router,
                    useValue: {
                        navigate: vi.fn().mockName("Router.navigate")
                    }
                },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            data: {
                                userData: mockUser
                            }
                        }
                    }
                }
            ]
        }).compileComponents();

        router = TestBed.inject(Router) as MockedObject<Router>;
        apiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
    });

    it('existing user saved successfully', () => {
        const userFormComponent = {
            markAllAsTouched: vi.fn().mockName("UserFormComponent.markAllAsTouched"),
            isValid: vi.fn().mockName("UserFormComponent.isValid")
        };
        userFormComponent.isValid.mockReturnValue(true);
        apiService.updateUser.mockReturnValue(of(mockUser));

        const fixture = TestBed.createComponent(UserEditComponent);
        const component = fixture.componentInstance;
        component.userFormComponent = userFormComponent as any;
        component.userData = mockUser;

        component.ngOnInit();
        component.save();

        expect(component.isSaveEnabled()).toBe(true);
        expect(component.userData).toEqual(mockUser);
        expect(userFormComponent.markAllAsTouched).toHaveBeenCalled();
        expect(apiService.updateUser).toHaveBeenCalledWith(expect.objectContaining(mockUser));
        expect(router.navigate).toHaveBeenCalledWith(['/benutzer/detail', mockUser.id]);
    });

});
