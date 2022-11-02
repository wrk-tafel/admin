import {TestBed, waitForAsync} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {LoginPasswordChangeComponent} from './login-passwordchange.component';
import {AuthenticationService} from '../../../common/security/authentication.service';
import {Router} from '@angular/router';
import {of} from 'rxjs';

describe('LoginPasswordChangeComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthenticationService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      declarations: [LoginPasswordChangeComponent],
      providers: [
        {
          provide: AuthenticationService,
          useValue: jasmine.createSpyObj('AuthenticationService', ['TODO'])
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
    fixture.detectChanges();

    expect(component).toBeTruthy();
  }));

  it('cancel password change', waitForAsync(() => {
    const fixture = TestBed.createComponent(LoginPasswordChangeComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.cancel();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['login']);
  }));

  it('isSaveDisabled is true when form is undefined', waitForAsync(() => {
    const fixture = TestBed.createComponent(LoginPasswordChangeComponent);
    const component = fixture.componentInstance;
    component.form = undefined;
    fixture.detectChanges();

    expect(component.isSaveDisabled()).toBeTrue();
  }));

  // TODO isSaveDisabled is false when form is valid
  // TODO isSaveDisabled is true when form is invalid

  it('changePassword successful', waitForAsync(() => {
    const fixture = TestBed.createComponent(LoginPasswordChangeComponent);
    const component = fixture.componentInstance;
    const formSpy = jasmine.createSpyObj(['changePassword']);
    component.form = formSpy;
    fixture.detectChanges();

    formSpy.changePassword.and.returnValue(of(true));

    component.changePassword();

    expect().toBeTrue();
  }));

});
