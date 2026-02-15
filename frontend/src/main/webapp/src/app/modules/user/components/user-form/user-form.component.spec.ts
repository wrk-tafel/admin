import type { MockedObject } from "vitest";
import {TestBed} from '@angular/core/testing';
import {passwordRepeatValidator, UserFormComponent, UserPermissionFormItem} from './user-form.component';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {CardModule, ColComponent, InputGroupComponent, RowComponent} from '@coreui/angular';
import {UserApiService, UserData, UserPermission} from '../../../../api/user-api.service';
import {of, throwError} from 'rxjs';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';

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
  let toastService: MockedObject<ToastService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
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
          provide: ToastService,
          useValue: {
            showToast: vi.fn().mockName("ToastService.showToast")
          }
        }
      ]
    }).compileComponents();

    userApiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
    toastService = TestBed.inject(ToastService) as MockedObject<ToastService>;
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

    expect(component.id.value).toBe(mockUser.id);
    expect(component.username.value).toBe(mockUser.username);
    expect(component.personnelNumber.value).toBe(mockUser.personnelNumber);
    expect(component.lastname.value).toBe(mockUser.lastname);
    expect(component.firstname.value).toBe(mockUser.firstname);
    expect(component.enabled.value).toBe(mockUser.enabled);
    expect(component.passwordChangeRequired.value).toBe(mockUser.passwordChangeRequired);

    expect(component.permissions.value).toEqual(
      mockPermissions.map((permission) => {
        const mapped: UserPermissionFormItem = {...permission, enabled: true};
        return mapped;
      })
    );
    expect(component.permissions.controls.length).toBe(2);
    expect(component.permissions.controls[0].value).toEqual({...mockPermissions[0], enabled: true});
    expect(component.permissions.controls[1].value).toEqual({...mockPermissions[1], enabled: true});
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

    component.personnelNumber.setValue(updatedPersonnelNumber);
    component.username.setValue(updatedUsername);
    component.lastname.setValue(updatedLastname);
    component.firstname.setValue(updatedFirstname);
    component.enabled.setValue(updatedEnabled);
    component.passwordChangeRequired.setValue(updatedPasswordChangeRequired);
    component.permissions.clear();

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
    const passwordControl = new FormControl();
    passwordControl.setValue('pwd');
    const passwordRepeatControl = new FormControl();
    passwordRepeatControl.setValue('pwd-different');

    const formGroup = new FormGroup({
      password: passwordControl,
      passwordRepeat: passwordRepeatControl
    });

    const result = passwordRepeatValidator(formGroup);
    expect(result['passwordRepeatInvalid']).toBe(true);
  });

  it('password-repeat validator passwords same', () => {
    const passwordControl = new FormControl();
    passwordControl.setValue('pwd');
    const passwordRepeatControl = new FormControl();
    passwordRepeatControl.setValue('pwd');

    const formGroup = new FormGroup({
      password: passwordControl,
      passwordRepeat: passwordRepeatControl
    });

    const result = passwordRepeatValidator(formGroup);
    expect(result).toBeNull();
  });

  it('generate password', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.detectChanges();
    component.passwordTextVisible = false;
    component.passwordRepeatTextVisible = false;

    const generatedPassword = 'random-pwd';
    userApiService.generatePassword.mockReturnValue(of({password: generatedPassword}));

    component.generatePassword();

    expect(component.password.value).toEqual(generatedPassword);
    expect(component.passwordRepeat.value).toEqual(generatedPassword);
    expect(component.passwordTextVisible).toBe(true);
    expect(component.passwordRepeatTextVisible).toBe(true);
  });

  it('generate password failed', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('permissionsData', mockPermissions);
    fixture.detectChanges();
    component.passwordTextVisible = false;
    component.passwordRepeatTextVisible = false;
    userApiService.generatePassword.mockReturnValue(throwError(() => 'generation failed'));

    component.generatePassword();

    expect(component.password.value).toBeNull();
    expect(component.passwordRepeat.value).toBeNull();
    expect(component.passwordTextVisible).toBe(false);
    expect(component.passwordRepeatTextVisible).toBe(false);

    expect(toastService.showToast).toHaveBeenCalledWith({
      type: ToastType.ERROR,
      title: 'Fehler',
      message: 'Passwort-Generierung fehlgeschlagen!'
    });
  });

});
