import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {UserFormComponent, UserPermissionFormItem} from './user-form.component';
import {FormField} from '@angular/forms/signals';
import {UserApiService, UserData, UserPermission} from '../../../../api/user-api.service';
import {EmployeeApiService, EmployeeData} from '../../../../api/employee-api.service';
import {MatDialog} from '@angular/material/dialog';
import {of, throwError} from 'rxjs';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {AuthenticationService} from '../../../../common/security/authentication.service';

describe('UserFormComponent', () => {
  const mockPermissions: UserPermission[] = [
    {key: 'PERM1', title: 'Permission 1', category: 'Category 1'},
    {key: 'PERM2', title: 'Permission 2', category: 'Category 2'}
  ];

  const mockUser: UserData = {
    id: 0,
    personnelNumber: '0000',
    username: 'username',
    firstname: 'first',
    lastname: 'last',
    enabled: true,
    passwordChangeRequired: false,
    permissions: mockPermissions
  };

  const mockEmployee: EmployeeData = {
    id: 1,
    personnelNumber: '0000',
    firstname: 'first',
    lastname: 'last'
  };

  let userApiService: MockedObject<UserApiService>;
  let employeeApiService: MockedObject<EmployeeApiService>;
  let toastr: MockedObject<TafelToastrService>;
  let authenticationService: MockedObject<AuthenticationService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormField
      ],
      providers: [
        {
          provide: UserApiService,
          useValue: {
            generatePassword: vi.fn().mockName('UserApiService.generatePassword')
          }
        },
        {
          provide: EmployeeApiService,
          useValue: {
            checkPersonnelNumberAvailability: vi.fn().mockName('EmployeeApiService.checkPersonnelNumberAvailability')
              .mockReturnValue(of({available: false, existingEmployee: mockEmployee})),
            findEmployees: vi.fn().mockName('EmployeeApiService.findEmployees')
              .mockReturnValue(of({items: [], totalCount: 0, currentPage: 1, totalPages: 1, pageSize: 10})),
            saveEmployee: vi.fn().mockName('EmployeeApiService.saveEmployee')
          }
        },
        {
          // the employee search opens a real dialog on its results, which outlives the fixture
          provide: MatDialog,
          useValue: {open: vi.fn().mockReturnValue({afterClosed: () => of(undefined)})}
        },
        {
          provide: TafelToastrService,
          useValue: {
            error: vi.fn().mockName('TafelToastrService.error'),
            success: vi.fn().mockName('TafelToastrService.success')
          }
        },
        {
          provide: AuthenticationService,
          useValue: {
            hasPermission: vi.fn().mockName('AuthenticationService.hasPermission').mockReturnValue(false)
          }
        }
      ]
    }).compileComponents();

    userApiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
    employeeApiService = TestBed.inject(EmployeeApiService) as MockedObject<EmployeeApiService>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
    authenticationService = TestBed.inject(AuthenticationService) as MockedObject<AuthenticationService>;
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('data filling works', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;

    vi.spyOn(component.userDataChange, 'emit');
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.componentRef.setInput('userData', mockUser);
    fixture.detectChanges();

    fixture.detectChanges();

    expect(component.userForm.id().value()).toBe(mockUser.id);
    expect(component.userForm.username().value()).toBe(mockUser.username);
    expect(component.userForm.personnelNumber().value()).toBe(mockUser.personnelNumber);
    expect(component.userForm.lastname().value()).toBe(mockUser.lastname);
    expect(component.userForm.firstname().value()).toBe(mockUser.firstname);
    expect(component.userForm.enabled().value()).toBe(mockUser.enabled);
    expect(component.userForm.passwordChangeRequired().value()).toBe(mockUser.passwordChangeRequired);

    expect(component.permissions()).toEqual(
      mockPermissions.map((permission) => {
        const mapped: UserPermissionFormItem = {...permission, enabled: true};
        return mapped;
      })
    );
    expect(component.permissions().length).toBe(2);
    expect(component.permissions()[0]).toEqual({...mockPermissions[0], enabled: true});
    expect(component.permissions()[1]).toEqual({...mockPermissions[1], enabled: true});
  });

  it('data update works', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;

    vi.spyOn(component.userDataChange, 'emit');
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.componentRef.setInput('userData', mockUser);
    fixture.detectChanges();

    const updatedUsername = 'updated';
    const updatedPersonnelNumber = 'updated';
    const updatedLastname = 'updated';
    const updatedFirstname = 'updated';
    const updatedEnabled = false;
    const updatedPasswordChangeRequired = true;

    component.userForm.personnelNumber().value.set(updatedPersonnelNumber);
    component.userForm.username().value.set(updatedUsername);
    component.userForm.lastname().value.set(updatedLastname);
    component.userForm.firstname().value.set(updatedFirstname);
    component.userForm.enabled().value.set(updatedEnabled);
    component.userForm.passwordChangeRequired().value.set(updatedPasswordChangeRequired);
    component.permissions.set([]);

    fixture.detectChanges();

    expect(component.userDataChange.emit).toHaveBeenCalledWith(expect.objectContaining({
      personnelNumber: updatedPersonnelNumber,
      username: updatedUsername,
      lastname: updatedLastname,
      firstname: updatedFirstname,
      enabled: updatedEnabled,
      passwordChangeRequired: updatedPasswordChangeRequired,
      permissions: []
    }));
  });

  it('permissions are grouped by category', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.detectChanges();

    expect(component.permissionGroups()).toEqual([
      {category: 'Category 1', permissions: [{...mockPermissions[0], enabled: false}]},
      {category: 'Category 2', permissions: [{...mockPermissions[1], enabled: false}]}
    ]);
  });

  it('togglePermission toggles only the matching permission by key', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.detectChanges();

    component.togglePermission('PERM2');

    expect(component.permissions()).toEqual([
      {...mockPermissions[0], enabled: false},
      {...mockPermissions[1], enabled: true}
    ]);
    expect(component.selectedPermissionsCount()).toBe(1);
    expect(component.totalPermissionsCount()).toBe(2);
  });

  it('toggleGroup selects all permissions in a category, then deselects them again', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.detectChanges();

    const group = component.permissionGroups()[0];
    expect(component.isGroupFullySelected(group)).toBe(false);

    component.toggleGroup(group);
    expect(component.permissions()[0].enabled).toBe(true);
    expect(component.isGroupFullySelected(component.permissionGroups()[0])).toBe(true);

    component.toggleGroup(component.permissionGroups()[0]);
    expect(component.permissions()[0].enabled).toBe(false);
  });

  describe('administrator permission', () => {
    const permissionsWithAdministrator: UserPermission[] = [
      ...mockPermissions,
      {key: 'ADMINISTRATOR', title: 'Administrator', category: 'Verwaltung'}
    ];

    function createComponentWithAdministrator(currentUserIsAdministrator: boolean) {
      authenticationService.hasPermission.mockImplementation(
        (permission: string) => currentUserIsAdministrator && permission === 'ADMINISTRATOR'
      );
      const fixture = TestBed.createComponent(UserFormComponent);
      fixture.componentRef.setInput('permissionsData', permissionsWithAdministrator);
      fixture.detectChanges();
      return fixture.componentInstance;
    }

    // The backend refuses the change either way (see UserController), so the form only avoids
    // offering an edit that would be rejected on save.
    it('locks the administrator checkbox for a user who is not an administrator', () => {
      const component = createComponentWithAdministrator(false);

      expect(component.isPermissionLocked('ADMINISTRATOR')).toBe(true);
      expect(component.isPermissionLocked('PERM1')).toBe(false);
    });

    it('leaves the administrator checkbox editable for an administrator', () => {
      const component = createComponentWithAdministrator(true);

      expect(component.isPermissionLocked('ADMINISTRATOR')).toBe(false);
    });

    it('ignores a toggle of the locked permission', () => {
      const component = createComponentWithAdministrator(false);

      component.togglePermission('ADMINISTRATOR');

      expect(component.permissions().find(permission => permission.key === 'ADMINISTRATOR')?.enabled).toBe(false);
    });

    /**
     * "Alle auswählen" must not be able to grant what the individual checkbox refuses - and it has
     * to stay usable, which is why the locked entry is excluded from the fully-selected check
     * rather than blocking the whole group.
     */
    it('skips the locked permission when selecting a whole category', () => {
      const component = createComponentWithAdministrator(false);
      const administratorGroup = component.permissionGroups().find(group => group.category === 'Verwaltung')!;

      component.toggleGroup(administratorGroup);

      expect(component.permissions().find(permission => permission.key === 'ADMINISTRATOR')?.enabled).toBe(false);
    });
  });

  it('password-repeat validator passwords different', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.detectChanges();

    component.userForm.password().value.set('pwd');
    component.userForm.passwordRepeat().value.set('pwd-different');
    fixture.detectChanges();

    const errors = component.userForm.passwordRepeat().errors();
    // In signal forms, errors() returns an array of error objects
    expect(errors?.length).toBeGreaterThan(0);
    expect(errors?.some((error: any) => error.kind === 'passwordRepeatInvalid')).toBe(true);
  });

  it('password-repeat validator passwords same', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.detectChanges();

    component.userForm.password().value.set('pwd');
    component.userForm.passwordRepeat().value.set('pwd');
    fixture.detectChanges();

    const errors = component.userForm.passwordRepeat().errors();
    // In signal forms, errors() returns an empty array when there are no errors
    expect(errors?.length).toBe(0);
  });

  it('password is required when creating a new user', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.detectChanges();

    expect(component.userForm.password().errors()?.some((error: any) => error.kind === 'required')).toBe(true);
    expect(component.userForm.passwordRepeat().errors()?.some((error: any) => error.kind === 'required')).toBe(true);
    expect(component.isValid()).toBe(false);

    component.setSelectedEmployee(mockEmployee);
    component.userForm.username().value.set('username');
    component.userForm.lastname().value.set('last');
    component.userForm.firstname().value.set('first');
    component.userForm.password().value.set('pwd');
    component.userForm.passwordRepeat().value.set('pwd');
    fixture.detectChanges();

    expect(component.userForm.password().errors()?.length).toBe(0);
    expect(component.userForm.passwordRepeat().errors()?.length).toBe(0);
    expect(component.isValid()).toBe(true);
  });

  it('personnel number requires a linked employee', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.detectChanges();

    // Typing a personnel number without resolving it through the search stays invalid...
    component.userForm.personnelNumber().value.set('0000');
    fixture.detectChanges();
    expect(component.userForm.personnelNumber().errors()?.some((error: any) => error.kind === 'employeeNotLinked')).toBe(true);
    expect(component.selectedEmployee()).toBeNull();

    // ...selecting the resolved employee links it and clears the error...
    component.setSelectedEmployee(mockEmployee);
    fixture.detectChanges();
    expect(component.selectedEmployee()).toEqual(mockEmployee);
    expect(component.userForm.personnelNumber().value()).toBe(mockEmployee.personnelNumber);
    expect(component.userForm.personnelNumber().errors()?.some((error: any) => error.kind === 'employeeNotLinked')).toBe(false);

    // ...and removing the link clears the personnel number and requires a new search again.
    component.resetSelectedEmployee();
    fixture.detectChanges();
    expect(component.selectedEmployee()).toBeNull();
    expect(component.userForm.personnelNumber().value()).toBe('');
  });

  it('selecting an employee fills in its name, and removing the link clears it again', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.detectChanges();

    component.setSelectedEmployee(mockEmployee);
    fixture.detectChanges();
    expect(component.userForm.lastname().value()).toBe(mockEmployee.lastname);
    expect(component.userForm.firstname().value()).toBe(mockEmployee.firstname);

    component.resetSelectedEmployee();
    fixture.detectChanges();
    expect(component.userForm.lastname().value()).toBe('');
    expect(component.userForm.firstname().value()).toBe('');
  });

  it('password stays optional when editing an existing user', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.componentRef.setInput('userData', mockUser);
    fixture.detectChanges();

    expect(component.userForm.password().value()).toBe('');
    expect(component.userForm.passwordRepeat().value()).toBe('');
    expect(component.userForm.password().errors()?.length).toBe(0);
    expect(component.userForm.passwordRepeat().errors()?.length).toBe(0);
    expect(component.isValid()).toBe(true);
  });

  it('resolves the linked employee for an existing user on load', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.componentRef.setInput('userData', mockUser);
    fixture.detectChanges();

    expect(employeeApiService.checkPersonnelNumberAvailability).toHaveBeenCalledWith(mockUser.personnelNumber);
    expect(component.selectedEmployee()).toEqual(mockEmployee);
    // Password fields sit behind the collapsed "Passwort zurücksetzen" section in edit mode.
    expect(component.passwordResetExpanded()).toBe(false);
    expect(component.passwordFieldsVisible()).toBe(false);

    component.togglePasswordResetSection();
    expect(component.passwordFieldsVisible()).toBe(true);
  });

  it('isDirty tracks changes against the loaded state and markSaved rebases it', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.componentRef.setInput('userData', mockUser);
    fixture.detectChanges();

    expect(component.isDirty()).toBe(false);

    component.userForm.firstname().value.set('changed');
    fixture.detectChanges();
    expect(component.isDirty()).toBe(true);

    component.markSaved();
    fixture.detectChanges();
    expect(component.isDirty()).toBe(false);
  });

  it('generate password', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.detectChanges();
    component.passwordTextVisible.set(false);
    component.passwordRepeatTextVisible.set(false);
    component.userForm.passwordChangeRequired().value.set(false);

    const generatedPassword = 'random-pwd';
    userApiService.generatePassword.mockReturnValue(of({password: generatedPassword}));

    component.generatePassword();

    expect(component.userForm.password().value()).toEqual(generatedPassword);
    expect(component.userForm.passwordRepeat().value()).toEqual(generatedPassword);
    expect(component.passwordTextVisible()).toBe(true);
    expect(component.passwordRepeatTextVisible()).toBe(true);
    // Handing over a generated password is the whole point of this button, so the sensible default
    // is requiring the recipient to set their own on first login.
    expect(component.userForm.passwordChangeRequired().value()).toBe(true);
  });

  it('copyPassword copies the current password value to the clipboard', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.detectChanges();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {value: {writeText}, configurable: true});

    component.userForm.password().value.set('generated-pwd');
    component.copyPassword();

    expect(writeText).toHaveBeenCalledWith('generated-pwd');
  });

  it('copyPassword does nothing when the password field is empty', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.detectChanges();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {value: {writeText}, configurable: true});

    component.copyPassword();

    expect(writeText).not.toHaveBeenCalled();
  });

  it('generate password failed', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.detectChanges();
    component.passwordTextVisible.set(false);
    component.passwordRepeatTextVisible.set(false);
    userApiService.generatePassword.mockReturnValue(throwError(() => 'generation failed'));

    component.generatePassword();

    expect(component.userForm.password().value()).toBe('');
    expect(component.userForm.passwordRepeat().value()).toBe('');
    expect(component.passwordTextVisible()).toBe(false);
    expect(component.passwordRepeatTextVisible()).toBe(false);

    expect(toastr.error).toHaveBeenCalledWith('Passwort-Generierung fehlgeschlagen!', 'Fehler');
  });

});
