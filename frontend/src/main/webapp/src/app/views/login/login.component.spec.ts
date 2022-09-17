import { TestBed, waitForAsync } from '@angular/core/testing';
import { Navigation, Router } from '@angular/router';
import { AuthenticationService } from '../../common/security/authentication.service';
import { LoginComponent } from './login.component';
import {ReactiveFormsModule} from '@angular/forms';

describe('LoginComponent', () => {
  let authService: jasmine.SpyObj<AuthenticationService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(waitForAsync(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthenticationService', ['login', 'removeToken']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'getCurrentNavigation']);

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        {
          provide: AuthenticationService,
          useValue: authServiceSpy
        },
        {
          provide: Router,
          useValue: routerSpy
        }
      ],
      declarations: [LoginComponent]
    }).compileComponents();

    authService = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
  }));

  it('init with expired flag should show message', waitForAsync(() => {
    const navigation: jasmine.SpyObj<Navigation> = jasmine.createSpyObj('Navigation', {}, { extras: { state: { errorType: 'expired' } } });
    router.getCurrentNavigation.and.returnValue(navigation);

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.errorMessage).toBe('Sitzung abgelaufen! Bitte erneut anmelden.');
  }));

  it('login successful', () => {
    authService.login.and.returnValue(Promise.resolve(true));

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.loginForm.setValue({
      'username': 'user',
      'password': 'pwd'
    });

    component.login().then(() => {
      expect(router.navigate).toHaveBeenCalledWith(['uebersicht']);
    });
  });

  it('login failed', () => {
    authService.login.and.returnValue(Promise.resolve(false));

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.loginForm.setValue({
      'username': 'user',
      'password': 'pwd'
    });

    component.login().then(() => {
      expect(component.errorMessage).toBe('Anmeldung fehlgeschlagen!');
    });
  });

});
