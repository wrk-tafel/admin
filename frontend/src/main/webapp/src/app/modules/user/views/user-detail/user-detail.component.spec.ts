import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserDetailComponent } from './user-detail.component';
import { UserApiService, UserData, UserPermission } from '../../../../api/user-api.service';
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

    const permissionsCatalog: UserPermission[] = [
        { key: 'PERM1', title: 'Permission 1', category: 'Category 1' },
        { key: 'PERM1B', title: 'Permission 1b', category: 'Category 1' },
        { key: 'PERM2', title: 'Permission 2', category: 'Category 2' },
        { key: 'PERM3', title: 'Permission 3', category: 'Category 3' }
    ];

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
                                userData: mockUser,
                                permissionsData: permissionsCatalog
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

    function createFixture(userData: UserData = mockUser): ComponentFixture<UserDetailComponent> {
        const fixture = TestBed.createComponent(UserDetailComponent);
        fixture.componentRef.setInput('userData', userData);
        fixture.componentRef.setInput('permissionsData', permissionsCatalog);
        fixture.detectChanges();
        return fixture;
    }

    it('component can be created', () => {
        const fixture = createFixture();
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('initial data loaded and shown correctly', () => {
        const fixture = createFixture();

        expect(getTextByTestId(fixture, 'nameText')).toBe(`${mockUser.lastname} ${mockUser.firstname}`);
        expect(getTextByTestId(fixture, 'usernameText')).toBe(mockUser.username);
        expect(getTextByTestId(fixture, 'personnelNumberText')).toBe(mockUser.personnelNumber);
        expect(getTextByTestId(fixture, 'passwordChangeRequiredText')).toBe('Ja');
        expect(getTextByTestId(fixture, 'enabledText')).toBe('Ja');
    });

    it('enable user', () => {
        const fixture = createFixture({ ...mockUser, enabled: false });
        const component = fixture.componentInstance;

        const updatedUserData = mockUser;
        userApiService.updateUser.mockReturnValueOnce(of(updatedUserData));

        component.enableUser();

        expect(userApiService.updateUser).toHaveBeenCalledWith({ ...mockUser, enabled: true });
        expect(component.currentUserData()).toEqual(updatedUserData);
    });

    it('disable user', () => {
        const fixture = createFixture({ ...mockUser, enabled: true });
        const component = fixture.componentInstance;

        const updatedUserData = mockUser;
        userApiService.updateUser.mockReturnValueOnce(of(updatedUserData));

        component.disableUser();

        expect(userApiService.updateUser).toHaveBeenCalledWith({ ...mockUser, enabled: false });
        expect(component.currentUserData()).toEqual(updatedUserData);
    });

    it('deleted user successfully', () => {
        const fixture = createFixture();
        const component = fixture.componentInstance;
        userApiService.deleteUser.mockReturnValueOnce(of(undefined));

        component.deleteUser();

        expect(userApiService.deleteUser).toHaveBeenCalledWith(mockUser.id);
        expect(router.navigate).toHaveBeenCalledWith(['/benutzer/suchen']);
        expect(toastr.success).toHaveBeenCalledWith('Benutzer wurde gelöscht!');
    });

    it('delete user failed', () => {
        const fixture = createFixture();
        const component = fixture.componentInstance;
        userApiService.deleteUser.mockReturnValueOnce(throwError(() => ({ status: 404 })));

        component.deleteUser();

        expect(userApiService.deleteUser).toHaveBeenCalledWith(mockUser.id);
        expect(router.navigate).not.toHaveBeenCalled();
        expect(toastr.error).toHaveBeenCalledWith('Löschen fehlgeschlagen!');
    });

    it('editUser should navigate properly', () => {
        const fixture = createFixture();
        fixture.componentInstance.editUser();

        expect(router.navigate).toHaveBeenCalledWith(['/benutzer/bearbeiten', mockUser.id]);
    });

    it('permissions grouped by category (collapsed, granted only)', () => {
        const fixture = createFixture();
        const component = fixture.componentInstance;

        expect(component.permissionGroups()).toEqual([
            {category: 'Category 1', permissions: [{permission: mockUser.permissions[0], granted: true}]},
            {category: 'Category 2', permissions: [{permission: mockUser.permissions[1], granted: true}]}
        ]);

        const permissionsText = getTextByTestId(fixture, 'permissionsText');
        expect(permissionsText).toContain('Category 1');
        expect(permissionsText).toContain(mockUser.permissions[0].title);
        expect(permissionsText).toContain('Category 2');
        expect(permissionsText).toContain(mockUser.permissions[1].title);
    });

    it('shows placeholder when user has no permissions', () => {
        const fixture = createFixture({...mockUser, permissions: []});

        expect(getTextByTestId(fixture, 'permissionsText')).toContain('-');
    });

    it('"Alle anzeigen" reveals the unassigned catalog permissions within categories the user already holds something in', () => {
        const fixture = createFixture();
        const component = fixture.componentInstance;

        fixture.debugElement.query(By.css('[testid="togglePermissionsButton"]')).nativeElement.click();
        fixture.detectChanges();

        expect(component.permissionGroups()).toEqual([
            {
                category: 'Category 1',
                permissions: [
                    {permission: permissionsCatalog[0], granted: true},
                    {permission: permissionsCatalog[1], granted: false}
                ]
            },
            {category: 'Category 2', permissions: [{permission: permissionsCatalog[2], granted: true}]}
        ]);
        // Category 3 (PERM3) is a category the user holds nothing in at all - omitted, not shown
        // fully greyed.
        expect(component.permissionGroups().map(group => group.category)).not.toContain('Category 3');

        const permissionsText = getTextByTestId(fixture, 'permissionsText');
        expect(permissionsText).toContain('Permission 1b');
        expect(permissionsText).not.toContain('Permission 3');
    });

    function getTextByTestId(fixture: ComponentFixture<UserDetailComponent>, testId: string): string {
        return fixture.debugElement.query(By.css(`[testid="${testId}"]`)).nativeElement.textContent;
    }

});
