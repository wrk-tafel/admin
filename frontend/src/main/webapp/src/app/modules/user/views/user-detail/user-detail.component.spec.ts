import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserDetailComponent } from './user-detail.component';
import { UserApiService, UserData } from '../../../../api/user-api.service';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('UserDetailComponent', () => {
    const mockUser: UserData = {
        id: 0,
        personnelNumber: '0000',
        username: 'username',
        firstname: 'first',
        lastname: 'last',
        enabled: true,
        passwordChangeRequired: true,
        permissions: [
            { key: 'PERM1', title: 'Permission 1', category: 'Category 1' },
            { key: 'PERM2', title: 'Permission 2', category: 'Category 2' }
        ]
    };

    let userApiService: MockedObject<UserApiService>;
    let router: MockedObject<Router>;
    let toastr: MockedObject<TafelToastrService>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                ReactiveFormsModule
            ],
            providers: [
                {
                    provide: UserApiService,
                    useValue: {
                        updateUser: vi.fn().mockName('UserApiService.updateUser'),
                        deleteUser: vi.fn().mockName('UserApiService.deleteUser')
                    }
                },
                {
                    provide: TafelToastrService,
                    useValue: {
                        success: vi.fn().mockName('TafelToastrService.success'),
                        error: vi.fn().mockName('TafelToastrService.error')
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
                },
                {
                    provide: Router,
                    useValue: {
                        navigate: vi.fn().mockName('Router.navigate')
                    }
                }
            ]
        }).compileComponents();

        userApiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
        router = TestBed.inject(Router) as MockedObject<Router>;
        toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
    });

    it('component can be created', () => {
        const fixture = TestBed.createComponent(UserDetailComponent);
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

    it('initial data loaded and shown correctly', () => {
        const fixture = TestBed.createComponent(UserDetailComponent);
        fixture.componentRef.setInput('userData', mockUser);
        fixture.detectChanges();

        expect(getTextByTestId(fixture, 'nameText')).toBe(`${mockUser.lastname} ${mockUser.firstname}`);
        expect(getTextByTestId(fixture, 'usernameText')).toBe(mockUser.username);
        expect(getTextByTestId(fixture, 'personnelNumberText')).toBe(mockUser.personnelNumber);
        expect(getTextByTestId(fixture, 'passwordChangeRequiredText')).toBe('Ja');
        expect(getTextByTestId(fixture, 'enabledText')).toBe('Ja');
    });

    it('enable user', () => {
        const fixture = TestBed.createComponent(UserDetailComponent);
        const component = fixture.componentInstance;
        fixture.componentRef.setInput('userData', { ...mockUser, enabled: false });
        fixture.detectChanges();

        const updatedUserData = mockUser;
        userApiService.updateUser.mockReturnValueOnce(of(updatedUserData));

        component.enableUser();

        expect(userApiService.updateUser).toHaveBeenCalledWith({ ...mockUser, enabled: true });
        expect(component.currentUserData()).toEqual(updatedUserData);
    });

    it('disable user', () => {
        const fixture = TestBed.createComponent(UserDetailComponent);
        const component = fixture.componentInstance;
        fixture.componentRef.setInput('userData', { ...mockUser, enabled: true });
        fixture.detectChanges();

        const updatedUserData = mockUser;
        userApiService.updateUser.mockReturnValueOnce(of(updatedUserData));

        component.disableUser();

        expect(userApiService.updateUser).toHaveBeenCalledWith({ ...mockUser, enabled: false });
        expect(component.currentUserData()).toEqual(updatedUserData);
    });

    it('deleted user successfully', () => {
        const fixture = TestBed.createComponent(UserDetailComponent);
        const component = fixture.componentInstance;
        fixture.componentRef.setInput('userData', mockUser);
        fixture.detectChanges();
        userApiService.deleteUser.mockReturnValueOnce(of(undefined));

        component.deleteUser();

        expect(userApiService.deleteUser).toHaveBeenCalledWith(mockUser.id);
        expect(router.navigate).toHaveBeenCalledWith(['/benutzer/suchen']);
        expect(toastr.success).toHaveBeenCalledWith('Benutzer wurde gelöscht!');
    });

    it('delete user failed', () => {
        const fixture = TestBed.createComponent(UserDetailComponent);
        const component = fixture.componentInstance;
        fixture.componentRef.setInput('userData', mockUser);
        fixture.detectChanges();
        userApiService.deleteUser.mockReturnValueOnce(throwError(() => ({ status: 404 })));

        component.deleteUser();

        expect(userApiService.deleteUser).toHaveBeenCalledWith(mockUser.id);
        expect(router.navigate).not.toHaveBeenCalled();
        expect(toastr.error).toHaveBeenCalledWith('Löschen fehlgeschlagen!');
    });

    it('editUser should navigate properly', () => {
        const fixture = TestBed.createComponent(UserDetailComponent);
        const component = fixture.componentInstance;
        fixture.componentRef.setInput('userData', mockUser);
        fixture.detectChanges();

        component.editUser();

        expect(router.navigate).toHaveBeenCalledWith(['/benutzer/bearbeiten', mockUser.id]);
    });

    it('permissions grouped by category', () => {
        const fixture = TestBed.createComponent(UserDetailComponent);
        const component = fixture.componentInstance;
        fixture.componentRef.setInput('userData', mockUser);

        fixture.detectChanges();

        expect(component.permissionGroups()).toEqual([
            {category: 'Category 1', permissions: [mockUser.permissions[0]]},
            {category: 'Category 2', permissions: [mockUser.permissions[1]]}
        ]);

        const permissionsText = getTextByTestId(fixture, 'permissionsText');
        expect(permissionsText).toContain('Category 1');
        expect(permissionsText).toContain(mockUser.permissions[0].title);
        expect(permissionsText).toContain('Category 2');
        expect(permissionsText).toContain(mockUser.permissions[1].title);
    });

    it('shows placeholder when user has no permissions', () => {
        const fixture = TestBed.createComponent(UserDetailComponent);
        fixture.componentRef.setInput('userData', {...mockUser, permissions: []});

        fixture.detectChanges();

        expect(getTextByTestId(fixture, 'permissionsText')).toContain('-');
    });

    function getTextByTestId(fixture: ComponentFixture<UserDetailComponent>, testId: string): string {
        return fixture.debugElement.query(By.css(`[testid="${testId}"]`)).nativeElement.textContent;
    }

});
