import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { Navigation, Router } from '@angular/router';
import { AuthenticationService } from '../../common/security/authentication.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  let authService: jasmine.SpyObj<AuthenticationService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(waitForAsync(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthenticationService', ['login', 'removeToken']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'getCurrentNavigation']);

    TestBed.configureTestingModule({
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

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  }));

  it('init with expired flag should show message', waitForAsync(() => {
    const navigation: jasmine.SpyObj<Navigation> = jasmine.createSpyObj('Navigation', {}, { extras: { state: { errorType: 'expired' } } });
    router.getCurrentNavigation.and.returnValue(navigation);

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;

    expect(component.errorMessage).toBe('Sitzung abgelaufen! Bitte erneut anmelden.');
  }));

  it('login successful', () => {
    authService.login.and.returnValue(Promise.resolve(true));

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

    component.loginForm.setValue({
      'username': 'user',
      'password': 'pwd'
    });

    component.login().then(() => {
      expect(component.errorMessage).toBe('Anmeldung fehlgeschlagen!');
    });
  });

});
