import {TestBed, waitForAsync} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {passwordRepeatValidator, UserFormComponent} from './user-form.component';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {CardModule, ColComponent, InputGroupComponent, RowComponent} from '@coreui/angular';
import {UserApiService, UserData, UserPermission} from '../../../api/user-api.service';
import {of, throwError} from 'rxjs';
import {ToastService, ToastType} from "../../../common/views/default-layout/toasts/toast.service";

describe('UserFormComponent', () => {
  const mockPermissions: UserPermission[] = [
    {key: 'PERM1', title: 'Permission 1', enabled: true},
    {key: 'PERM2', title: 'Permission 2', enabled: false}
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

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        ReactiveFormsModule,
        InputGroupComponent,
        CardModule,
        RowComponent,
        ColComponent
      ],
      declarations: [
        UserFormComponent
      ],
      providers: [
        {
          provide: UserApiService,
          useValue: jasmine.createSpyObj('UserApiService', ['generatePassword', 'getPermissions'])
        },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj('ToastService', ['showToast'])
        }
      ]
    }).compileComponents();

    userApiService = TestBed.inject(UserApiService) as jasmine.SpyObj<UserApiService>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  }));

  it('data filling works', waitForAsync(() => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;

    spyOn(component.userDataChange, 'emit');
    component.userData = mockUser;
    component.permissionsData = mockPermissions;
    component.ngOnInit();

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
    expect(component.permissions.value).toEqual(mockPermissions);
    expect(component.passwordChangeRequired.value).toBe(mockUser.passwordChangeRequired);
  }));

  it('data update works', waitForAsync(() => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    userApiService.getPermissions.and.returnValue(of({permissions: mockPermissions}));

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

    fixture.detectChanges();

    expect(component.userDataChange.emit).toHaveBeenCalledWith(jasmine.objectContaining({
      personnelNumber: updatedPersonnelNumber,
      username: updatedUsername,
      lastname: updatedLastname,
      firstname: updatedFirstname,
      enabled: updatedEnabled,
      passwordChangeRequired: updatedPasswordChangeRequired,
      permissions: []
    }));
  }));

  it('password-repeat validator passwords different', waitForAsync(() => {
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
  }));

  it('password-repeat validator passwords same', waitForAsync(() => {
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
  }));

  it('generate password', waitForAsync(() => {
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
  }));

  it('generate password failed', waitForAsync(() => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    component.passwordTextVisible = false;
    component.passwordRepeatTextVisible = false;

    const generatedPassword = 'random-pwd';
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
  }));

});
