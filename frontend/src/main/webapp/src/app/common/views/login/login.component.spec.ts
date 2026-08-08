import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, Router} from '@angular/router';
import {AuthenticationService} from '../../security/authentication.service';
import {LoginComponent} from './login.component';
import {EMPTY, of} from 'rxjs';
import {ConfigApiService} from '../../../api/config-api.service';

describe('LoginComponent', () => {
    let authService: MockedObject<AuthenticationService>;
    let router: MockedObject<Router>;
    let configApiService: MockedObject<ConfigApiService>;

    beforeEach(() => {
        const authServiceSpy = {
            login: vi.fn().mockName('AuthenticationService.login')
        };
        const configApiServiceSpy = {
            getPublicConfig: vi.fn().mockName('ConfigApiService.getPublicConfig').mockReturnValue(of(null))
        };
        const routerSpy = {
            navigate: vi.fn().mockName('Router.navigate'),
            getCurrentNavigation: vi.fn().mockName('Router.getCurrentNavigation')
        };

        TestBed.configureTestingModule({
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
                        params: EMPTY
                    }
                },
                {
                    provide: ConfigApiService,
                    useValue: configApiServiceSpy
                },
            ],
        }).compileComponents();

        authService = TestBed.inject(AuthenticationService) as MockedObject<AuthenticationService>;
        router = TestBed.inject(Router) as MockedObject<Router>;
        configApiService = TestBed.inject(ConfigApiService) as MockedObject<ConfigApiService>;
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
        const loginResult = { successful: true, passwordChangeRequired: false, locked: false };
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
        const loginResult = { successful: false, passwordChangeRequired: false, locked: false };
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

    it('login failed - account locked', async () => {
        const loginResult = { successful: false, passwordChangeRequired: false, locked: true };
        authService.login.mockReturnValue(Promise.resolve(loginResult));

        const fixture = TestBed.createComponent(LoginComponent);
        const component = fixture.componentInstance;

        component.loginFormModel.set({
            username: 'user',
            password: 'pwd'
        });

        await component.login();

        expect(component.errorMessage()).toBe('Konto vorübergehend gesperrt! Bitte versuchen Sie es später erneut.');
    });

    it('login but passwordchange required', async () => {
        const loginResult = { successful: true, passwordChangeRequired: true, locked: false };
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

    describe('environmentLabel', () => {
        it('stays empty when the public config cannot be read', () => {
            configApiService.getPublicConfig.mockReturnValue(of(null));

            const fixture = TestBed.createComponent(LoginComponent);
            const component = fixture.componentInstance;

            expect(component.environmentLabel()).toBe('');
        });

        it('is hidden when the deployment has no environment label', () => {
            configApiService.getPublicConfig.mockReturnValue(of({environmentLabel: ''}));

            const fixture = TestBed.createComponent(LoginComponent);
            fixture.detectChanges();

            expect(fixture.nativeElement.querySelector('[testid="environmentLabel"]')).toBeNull();
        });

        it('is read from the public config and shown beneath the title', () => {
            configApiService.getPublicConfig.mockReturnValue(of({environmentLabel: 'DEV'}));

            const fixture = TestBed.createComponent(LoginComponent);
            const component = fixture.componentInstance;
            fixture.detectChanges();

            expect(component.environmentLabel()).toBe('DEV');
            const badge: HTMLElement = fixture.nativeElement.querySelector('[testid="environmentLabel"]');
            expect(badge.textContent?.trim()).toBe('DEV');
        });
    });

});
