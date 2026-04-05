import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {UserFormComponent, UserPermissionFormItem} from './user-form.component';
import {FormField} from '@angular/forms/signals';
import {CardModule, ColComponent, InputGroupComponent, RowComponent} from '@coreui/angular';
import {UserApiService, UserData, UserPermission} from '../../../../api/user-api.service';
import {of, throwError} from 'rxjs';
import { ToastrService } from 'ngx-toastr';

describe('UserFormComponent', () => {
  const mockPermissions: UserPermission[] = [
    {key: 'PERM1', title: 'Permission 1'},
    {key: 'PERM2', title: 'Permission 2'}
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

  let userApiService: MockedObject<UserApiService>;
  let toastr: MockedObject<ToastrService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FormField,
        InputGroupComponent,
        CardModule,
        RowComponent,
        ColComponent
      ],
      providers: [
        {
          provide: UserApiService,
          useValue: {
            generatePassword: vi.fn().mockName("UserApiService.generatePassword")
          }
        },
        {
          provide: ToastrService,
          useValue: {
            error: vi.fn().mockName("ToastrService.error")
          }
        }
      ]
    }).compileComponents();

    userApiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
    toastr = TestBed.inject(ToastrService) as MockedObject<ToastrService>;
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

    // TODO check dom elements - makes more sense
    /*
    fixture.detectChanges();

    fixture.whenStable().then(() => {
      expect(fixture.debugElement.query(By.css('[testid="idInput"]')).nativeElement.value).toBe(testData.id);
    });
    */

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

  it('generate password', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.detectChanges();
    component.passwordTextVisible.set(false);
    component.passwordRepeatTextVisible.set(false);

    const generatedPassword = 'random-pwd';
    userApiService.generatePassword.mockReturnValue(of({password: generatedPassword}));

    component.generatePassword();

    expect(component.userForm.password().value()).toEqual(generatedPassword);
    expect(component.userForm.passwordRepeat().value()).toEqual(generatedPassword);
    expect(component.passwordTextVisible()).toBe(true);
    expect(component.passwordRepeatTextVisible()).toBe(true);
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

    expect(component.userForm.password().value()).toBe(null);
    expect(component.userForm.passwordRepeat().value()).toBe(null);
    expect(component.passwordTextVisible()).toBe(false);
    expect(component.passwordRepeatTextVisible()).toBe(false);

    expect(toastr.error).toHaveBeenCalledWith('Passwort-Generierung fehlgeschlagen!', 'Fehler');
  });

});
