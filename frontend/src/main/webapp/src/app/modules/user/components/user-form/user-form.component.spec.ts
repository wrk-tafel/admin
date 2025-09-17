import {TestBed} from '@angular/core/testing';
import {passwordRepeatValidator, UserFormComponent, UserPermissionFormItem} from './user-form.component';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {CardModule, ColComponent, InputGroupComponent, RowComponent} from '@coreui/angular';
import {UserApiService, UserData, UserPermission} from '../../../../api/user-api.service';
import {of, throwError} from 'rxjs';
import {ToastService, ToastType} from '../../../../common/components/toasts/toast.service';
import {provideZonelessChangeDetection} from "@angular/core";

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

  let userApiService: jasmine.SpyObj<UserApiService>;
  let toastService: jasmine.SpyObj<ToastService>;

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
        provideZonelessChangeDetection(),
        {
          provide: UserApiService,
          useValue: jasmine.createSpyObj('UserApiService', ['generatePassword'])
        },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj('ToastService', ['showToast'])
        }
      ]
    }).compileComponents();

    userApiService = TestBed.inject(UserApiService) as jasmine.SpyObj<UserApiService>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('data filling works', async () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;

    spyOn(component.userDataChange, 'emit');
    component.userData = mockUser;
    component.permissionsData = mockPermissions;
    component.ngOnInit();

    await fixture.whenStable();

    // TODO check dom elements - makes more sense
    /*
    await fixture.whenStable();

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

  it('data update works', async () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;

    spyOn(component.userDataChange, 'emit');
    component.userData = mockUser;
    component.permissionsData = mockPermissions;
    component.ngOnInit();

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

    await fixture.whenStable();

    expect(component.userDataChange.emit).toHaveBeenCalledWith(jasmine.objectContaining({
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
    expect(result['passwordRepeatInvalid']).toBeTrue();
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
    component.passwordTextVisible = false;
    component.passwordRepeatTextVisible = false;

    const generatedPassword = 'random-pwd';
    userApiService.generatePassword.and.returnValues(of({password: generatedPassword}));

    component.generatePassword();

    expect(component.password.value).toEqual(generatedPassword);
    expect(component.passwordRepeat.value).toEqual(generatedPassword);
    expect(component.passwordTextVisible).toBeTrue();
    expect(component.passwordRepeatTextVisible).toBeTrue();
  });

  it('generate password failed', () => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    component.passwordTextVisible = false;
    component.passwordRepeatTextVisible = false;
    userApiService.generatePassword.and.returnValues(throwError(() => 'generation failed'));

    component.generatePassword();

    expect(component.password.value).toBeNull();
    expect(component.passwordRepeat.value).toBeNull();
    expect(component.passwordTextVisible).toBeFalse();
    expect(component.passwordRepeatTextVisible).toBeFalse();

    expect(toastService.showToast).toHaveBeenCalledWith({
      type: ToastType.ERROR,
      title: 'Fehler',
      message: 'Passwort-Generierung fehlgeschlagen!'
    });
  });

});
