import {fakeAsync, TestBed, tick, waitForAsync} from '@angular/core/testing';
import {AbstractControl, ReactiveFormsModule} from '@angular/forms';
import {LoginPasswordChangeComponent} from './login-passwordchange.component';
import {AuthenticationService, LoginResult} from '../../security/authentication.service';
import {Router} from '@angular/router';
import {firstValueFrom, of} from 'rxjs';
import {PasswordChangeFormComponent} from '../passwordchange-form/passwordchange-form.component';
import {CardModule, ColComponent, ContainerComponent, RowComponent} from '@coreui/angular';
import {provideHttpClient} from "@angular/common/http";
import {provideHttpClientTesting} from "@angular/common/http/testing";

describe('LoginPasswordChangeComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthenticationService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        CardModule,
        ContainerComponent,
        RowComponent,
        ColComponent
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthenticationService,
          useValue: jasmine.createSpyObj('AuthenticationService', ['login', 'getUsername'])
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate'])
        }
      ]
    }).compileComponents();

    authServiceSpy = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(LoginPasswordChangeComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  }));

  it('cancel password change', waitForAsync(() => {
    const fixture = TestBed.createComponent(LoginPasswordChangeComponent);
    const component = fixture.componentInstance;

    component.cancel();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['login']);
  }));

  it('isSaveDisabled is true when form is undefined', waitForAsync(() => {
    const fixture = TestBed.createComponent(LoginPasswordChangeComponent);
    const component = fixture.componentInstance;
    component.form = undefined;

    expect(component.isSaveDisabled()).toBeTrue();
  }));

  // TODO test: isSaveDisabled is false when form is valid
  // TODO test: isSaveDisabled is true when form is invalid

  it('changePassword successful', fakeAsync(() => {
    const testUsername = 'test-username';
    const testNewPassword = 'test-new-password';

    const fixture = TestBed.createComponent(LoginPasswordChangeComponent);
    const component = fixture.componentInstance;
    component.form = TestBed.createComponent(PasswordChangeFormComponent).componentInstance;
    spyOn(component.form, 'changePassword').and.returnValue(of(true));
    spyOnProperty(component.form, 'newPassword', 'get').and.returnValue({value: testNewPassword} as AbstractControl);
    authServiceSpy.getUsername.and.returnValue(testUsername);

    const loginResult: LoginResult = {successful: true, passwordChangeRequired: false};
    authServiceSpy.login.and.returnValue(firstValueFrom(of(loginResult)));

    component.changePassword();

    // TODO get rid of the wait
    tick(1000);

    expect(authServiceSpy.login).toHaveBeenCalledWith(testUsername, testNewPassword);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['uebersicht']);
  }));

});
