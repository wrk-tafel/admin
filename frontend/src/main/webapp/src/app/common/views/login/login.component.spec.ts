import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, Router} from '@angular/router';
import {AuthenticationService} from '../../security/authentication.service';
import {LoginComponent} from './login.component';
import {EMPTY, of} from 'rxjs';
import {CardModule, ColComponent, ContainerComponent, InputGroupComponent, RowComponent} from '@coreui/angular';
import {IconSetService} from '@coreui/icons-angular';
import {cilLockLocked, cilUser} from '@coreui/icons';

describe('LoginComponent', () => {
    let authService: MockedObject<AuthenticationService>;
    let router: MockedObject<Router>;

    beforeEach(() => {
        const authServiceSpy = {
            login: vi.fn().mockName("AuthenticationService.login")
        };
        const routerSpy = {
            navigate: vi.fn().mockName("Router.navigate"),
            getCurrentNavigation: vi.fn().mockName("Router.getCurrentNavigation")
        };

        TestBed.configureTestingModule({
            imports: [
                ContainerComponent,
                RowComponent,
                ColComponent,
                CardModule,
                InputGroupComponent
            ],
            providers: [
                IconSetService,
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
                        params: EMPTY
                    }
                },
            ],
        }).compileComponents();

        const iconSetService = TestBed.inject(IconSetService);
        iconSetService.icons = {cilUser, cilLockLocked};

        authService = TestBed.inject(AuthenticationService) as MockedObject<AuthenticationService>;
        router = TestBed.inject(Router) as MockedObject<Router>;
    });

    it('should create the component', () => {
        const fixture = TestBed.createComponent(LoginComponent);
        const component = fixture.componentInstance;

        expect(component).toBeTruthy();
    });

    it('init with expired flag should show message', () => {
        TestBed.inject(ActivatedRoute).params = of({ errorType: 'abgelaufen' });

        const fixture = TestBed.createComponent(LoginComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.errorMessage()).toBe('Sitzung abgelaufen! Bitte erneut anmelden.');
    });

    it('init with forbidden flag should show message', () => {
        TestBed.inject(ActivatedRoute).params = of({ errorType: 'fehlgeschlagen' });

        const fixture = TestBed.createComponent(LoginComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.errorMessage()).toBe('Zugriff nicht erlaubt!');
    });

    it('login successful', async () => {
        const loginResult = { successful: true, passwordChangeRequired: false };
        authService.login.mockReturnValue(Promise.resolve(loginResult));

        const fixture = TestBed.createComponent(LoginComponent);
        const component = fixture.componentInstance;

        component.loginFormModel.set({
            username: 'user',
            password: 'pwd'
        });

        let expectedDone = false;

        await component.login().then(() => {
            expect(router.navigate).toHaveBeenCalledWith(['uebersicht']);
            expectedDone = true;
        });

        expect(expectedDone).toBe(true);
    });

    it('login failed', async () => {
        const loginResult = { successful: false, passwordChangeRequired: false };
        authService.login.mockReturnValue(Promise.resolve(loginResult));

        const fixture = TestBed.createComponent(LoginComponent);
        const component = fixture.componentInstance;

        component.loginFormModel.set({
            username: 'user',
            password: 'pwd'
        });

        await component.login();

        expect(component.errorMessage()).toBe('Anmeldung fehlgeschlagen!');
    });

    it('login but passwordchange required', async () => {
        const loginResult = { successful: true, passwordChangeRequired: true };
        authService.login.mockReturnValue(Promise.resolve(loginResult));

        const fixture = TestBed.createComponent(LoginComponent);
        const component = fixture.componentInstance;

        component.loginFormModel.set({
            username: 'user',
            password: 'pwd'
        });

        await component.login();

        expect(router.navigate).toHaveBeenCalledWith(['/login/passwortaendern']);
    });

});
