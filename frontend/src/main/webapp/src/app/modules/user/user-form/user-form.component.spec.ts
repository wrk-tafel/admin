import {TestBed, waitForAsync} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {passwordRepeatValidator, UserFormComponent} from './user-form.component';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {CardModule, ColComponent, InputGroupComponent, RowComponent} from '@coreui/angular';
import {UserApiService, UserData} from '../../../api/user-api.service';
import {of} from 'rxjs';

describe('UserFormComponent', () => {
  const mockUser: UserData = {
    id: 0,
    personnelNumber: '0000',
    username: 'username',
    firstname: 'first',
    lastname: 'last',
    enabled: true,
    passwordChangeRequired: false,
    permissions: []
  };

  let userApiService: jasmine.SpyObj<UserApiService>;

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
          useValue: jasmine.createSpyObj('UserApiService', ['generatePassword'])
        }
      ]
    }).compileComponents();

    userApiService = TestBed.inject(UserApiService) as jasmine.SpyObj<UserApiService>;
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
    component.ngOnInit();
    component.userData = mockUser;

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
  }));

  it('data update works', waitForAsync(() => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;

    spyOn(component.userDataChange, 'emit');
    component.ngOnInit();
    component.userData = mockUser;

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

    fixture.detectChanges();

    expect(component.userDataChange.emit).toHaveBeenCalledWith(jasmine.objectContaining({
      personnelNumber: updatedPersonnelNumber,
      username: updatedUsername,
      lastname: updatedLastname,
      firstname: updatedFirstname,
      enabled: updatedEnabled,
      passwordChangeRequired: updatedPasswordChangeRequired
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

});