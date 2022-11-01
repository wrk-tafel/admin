import {TestBed, waitForAsync} from '@angular/core/testing';
import {ActivatedRoute, Router} from '@angular/router';
import {AuthenticationService} from '../../../common/security/authentication.service';
import {LoginComponent} from './login.component';
import {ReactiveFormsModule} from '@angular/forms';
import {of} from "rxjs";

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
        },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of()
          }
        },
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
    TestBed.inject(ActivatedRoute).params = of({errorType: 'expired'});

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.errorMessage).toBe('Sitzung abgelaufen! Bitte erneut anmelden.');
  }));

  it('init with forbidden flag should show message', waitForAsync(() => {
    TestBed.inject(ActivatedRoute).params = of({errorType: 'forbidden'});

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.errorMessage).toBe('Zugriff nicht erlaubt!');
  }));

  it('login successful', async () => {
    authService.login.and.returnValue(Promise.resolve(true));

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.loginForm.setValue({
      'username': 'user',
      'password': 'pwd'
    });

    let expectedDone = false;

    await component.login().then(() => {
      expect(router.navigate).toHaveBeenCalledWith(['uebersicht']);
      expectedDone = true;
    });

    expect(expectedDone).toBe(true);
  });

  it('login failed', async () => {
    authService.login.and.returnValue(Promise.resolve(false));

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.loginForm.setValue({
      'username': 'user',
      'password': 'pwd'
    });

    let expectedDone = false;

    await component.login().then(() => {
      expect(component.errorMessage).toBe('Anmeldung fehlgeschlagen!');
      expectedDone = true;
    });

    expect(expectedDone).toBe(true);
  });

});
