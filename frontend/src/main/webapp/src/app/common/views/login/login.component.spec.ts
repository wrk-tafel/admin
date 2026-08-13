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
        const loginResult = { successful: true, passwordChangeRequired: false, locked: false, serverUnreachable: false };
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
        const loginResult = { successful: false, passwordChangeRequired: false, locked: false, serverUnreachable: false };
        authService.login.mockReturnValue(Promise.resolve(loginResult));

        const fixture = TestBed.createComponent(LoginComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();

        component.loginFormModel.set({
            username: 'user',
            password: 'pwd'
        });

        await component.login();

        expect(component.errorMessage()).toBe('Anmeldung fehlgeschlagen!');
    });

    it('login failed - account locked, no configured duration known', async () => {
        const loginResult = { successful: false, passwordChangeRequired: false, locked: true, serverUnreachable: false };
        authService.login.mockReturnValue(Promise.resolve(loginResult));
        configApiService.getPublicConfig.mockReturnValue(of(null));

        const fixture = TestBed.createComponent(LoginComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();

        component.loginFormModel.set({
            username: 'user',
            password: 'pwd'
        });

        await component.login();

        expect(component.errorMessage()).toBe(
            'Konto vorübergehend gesperrt! Bitte versuchen Sie es später erneut oder wenden Sie sich an eine'
            + ' Administratorin/einen Administrator.'
        );
    });

    it('login failed - account locked mentions the configured lockout duration', async () => {
        const loginResult = { successful: false, passwordChangeRequired: false, locked: true, serverUnreachable: false };
        authService.login.mockReturnValue(Promise.resolve(loginResult));
        configApiService.getPublicConfig.mockReturnValue(of({ environmentLabel: '', accountLockoutDurationInSeconds: 300 }));

        const fixture = TestBed.createComponent(LoginComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();

        component.loginFormModel.set({
            username: 'user',
            password: 'pwd'
        });

        await component.login();

        expect(component.errorMessage()).toBe(
            'Konto vorübergehend gesperrt! Bitte versuchen Sie es in ca. 5 Minuten erneut oder wenden Sie sich an eine'
            + ' Administratorin/einen Administrator.'
        );
    });

    it('login failed - server unreachable shows a distinct message from a plain credentials failure', async () => {
        const loginResult = { successful: false, passwordChangeRequired: false, locked: false, serverUnreachable: true };
        authService.login.mockReturnValue(Promise.resolve(loginResult));

        const fixture = TestBed.createComponent(LoginComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();

        component.loginFormModel.set({
            username: 'user',
            password: 'pwd'
        });

        await component.login();

        expect(component.errorMessage()).toContain('Server nicht erreichbar');
    });

    it('login failure moves focus back to the username field and selects its content', async () => {
        const loginResult = { successful: false, passwordChangeRequired: false, locked: false, serverUnreachable: false };
        authService.login.mockReturnValue(Promise.resolve(loginResult));

        const fixture = TestBed.createComponent(LoginComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();

        const usernameInput: HTMLInputElement = fixture.nativeElement.querySelector('[testid="username"]');
        const selectSpy = vi.spyOn(usernameInput, 'select');

        component.loginFormModel.set({
            username: 'user',
            password: 'pwd'
        });

        await component.login();

        expect(document.activeElement).toBe(usernameInput);
        expect(selectSpy).toHaveBeenCalled();
    });

    it('login but passwordchange required', async () => {
        const loginResult = { successful: true, passwordChangeRequired: true, locked: false, serverUnreachable: false };
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
            configApiService.getPublicConfig.mockReturnValue(of({environmentLabel: '', accountLockoutDurationInSeconds: 300}));

            const fixture = TestBed.createComponent(LoginComponent);
            fixture.detectChanges();

            expect(fixture.nativeElement.querySelector('[testid="environmentLabel"]')).toBeNull();
        });

        it('is read from the public config and shown as a full-width banner above the card', () => {
            configApiService.getPublicConfig.mockReturnValue(of({environmentLabel: 'DEV', accountLockoutDurationInSeconds: 300}));

            const fixture = TestBed.createComponent(LoginComponent);
            const component = fixture.componentInstance;
            fixture.detectChanges();

            expect(component.environmentLabel()).toBe('DEV');
            const banner: HTMLElement = fixture.nativeElement.querySelector('[testid="environmentLabel"]');
            expect(banner.textContent?.trim()).toBe('DEV');
            expect(banner.getAttribute('role')).toBe('status');
        });
    });

    describe('capsLockActive', () => {
        it('is set when Caps Lock is on and cleared again once it is turned off', () => {
            const fixture = TestBed.createComponent(LoginComponent);
            const component = fixture.componentInstance;
            fixture.detectChanges();

            const passwordInput: HTMLInputElement = fixture.nativeElement.querySelector('[testid="password"]');
            passwordInput.dispatchEvent(capsLockKeyEvent('keydown', true));
            expect(component.capsLockActive()).toBe(true);

            passwordInput.dispatchEvent(capsLockKeyEvent('keyup', false));
            expect(component.capsLockActive()).toBe(false);
        });

        it('shows a visible hint next to the password field while active', () => {
            const fixture = TestBed.createComponent(LoginComponent);
            fixture.detectChanges();

            const passwordInput: HTMLInputElement = fixture.nativeElement.querySelector('[testid="password"]');
            passwordInput.dispatchEvent(capsLockKeyEvent('keydown', true));
            fixture.detectChanges();

            expect(fixture.nativeElement.querySelector('[testid="capsLockWarning"]')).toBeTruthy();
        });
    });

    it('the submit button is never disabled for empty/invalid fields, only while a request is in flight', () => {
        const fixture = TestBed.createComponent(LoginComponent);
        fixture.detectChanges();

        const loginButton: HTMLButtonElement = fixture.nativeElement.querySelector('[testid="loginButton"]');
        expect(loginButton.disabled).toBe(false);
    });

    // A real button click, not a dispatched submit event: [formField] reflects the schema's
    // `required` onto the native inputs, so without novalidate on the <form> the browser's own
    // constraint validation swallows the click before the submit handler (and with it the
    // touched-marking that makes the mat-errors visible) ever runs.
    it('clicking submit on an empty form shows both required mat-errors instead of logging in', async () => {
        const fixture = TestBed.createComponent(LoginComponent);
        fixture.detectChanges();

        const loginButton: HTMLButtonElement = fixture.nativeElement.querySelector('[testid="loginButton"]');
        loginButton.click();
        await fixture.whenStable();
        fixture.detectChanges();

        const errorMessages = Array.from(fixture.nativeElement.querySelectorAll('mat-error'))
            .map((error) => (error as HTMLElement).textContent?.trim());
        expect(errorMessages).toContain('Benutzername ist erforderlich');
        expect(errorMessages).toContain('Passwort ist erforderlich');
        expect(authService.login).not.toHaveBeenCalled();
    });

    function capsLockKeyEvent(type: 'keydown' | 'keyup', capsLockOn: boolean): KeyboardEvent {
        const event = new KeyboardEvent(type, {key: 'a', bubbles: true});
        vi.spyOn(event, 'getModifierState').mockReturnValue(capsLockOn);
        return event;
    }

});
