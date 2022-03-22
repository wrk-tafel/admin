import { fakeAsync, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Navigation, Router, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthenticationService } from '../../common/security/authentication.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let authService: jasmine.SpyObj<AuthenticationService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(waitForAsync(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthenticationService', ['login', 'removeToken']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'getCurrentNavigation']);

    TestBed.configureTestingModule({
      declarations: [
        LoginComponent
      ],
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
      imports: [RouterTestingModule, FormsModule]
    }).compileComponents();

    authService = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  }));

  it('should create the app', waitForAsync(() => {
    const fixture = TestBed.createComponent(LoginComponent);
    const app = fixture.debugElement.componentInstance;

    expect(app).toBeTruthy();
  }));

  it('init with expired flag should show message', waitForAsync(() => {
    const navigation: jasmine.SpyObj<Navigation> = jasmine.createSpyObj('Navigation', {}, { extras: { state: { errorType: 'expired' } } });
    router.getCurrentNavigation.and.returnValue(navigation);

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;

    expect(component.errorMsg).toBe('Sitzung abgelaufen! Bitte erneut anmelden.');
  }));

  it('onClickSubmit - login successful', waitForAsync(() => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    authService.login.and.returnValue(Promise.resolve(true));

    component.onClickSubmit({ username: 'test', password: 'pwd' }).then(() => {
      expect(router.navigate).toHaveBeenCalledWith(['uebersicht']);
    });
  }));

  it('onClickSubmit - login failed', waitForAsync(() => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    authService.login.and.returnValue(Promise.resolve(false));

    component.onClickSubmit({ username: 'test', password: 'pwd' }).then(() => {
      expect(component.errorMsg).toBe('Anmeldung fehlgeschlagen!');
    });
  }));

});
