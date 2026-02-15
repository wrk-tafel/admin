import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { LoginPasswordChangeComponent } from './login-passwordchange.component';
import { AuthenticationService, LoginResult } from '../../security/authentication.service';
import { Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { PasswordChangeFormComponent } from '../passwordchange-form/passwordchange-form.component';
import { CardModule, ColComponent, ContainerComponent, RowComponent } from '@coreui/angular';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('LoginPasswordChangeComponent', () => {
    let authServiceSpy: MockedObject<AuthenticationService>;
    let routerSpy: MockedObject<Router>;

    beforeEach(() => {
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
                    useValue: {
                        login: vi.fn().mockName("AuthenticationService.login"),
                        getUsername: vi.fn().mockName("AuthenticationService.getUsername")
                    }
                },
                {
                    provide: Router,
                    useValue: {
                        navigate: vi.fn().mockName("Router.navigate")
                    }
                }
            ]
        }).compileComponents();

        authServiceSpy = TestBed.inject(AuthenticationService) as MockedObject<AuthenticationService>;
        routerSpy = TestBed.inject(Router) as MockedObject<Router>;
    });

    it('should create the component', () => {
        const fixture = TestBed.createComponent(LoginPasswordChangeComponent);
        const component = fixture.componentInstance;

        expect(component).toBeTruthy();
    });

    it('cancel password change', () => {
        const fixture = TestBed.createComponent(LoginPasswordChangeComponent);
        const component = fixture.componentInstance;

        component.cancel();

        expect(routerSpy.navigate).toHaveBeenCalledWith(['login']);
    });

    it('saveDisabled is true when form is undefined', () => {
        const fixture = TestBed.createComponent(LoginPasswordChangeComponent);
        const component = fixture.componentInstance;

        expect(component.saveDisabled()).toBe(true);
    });

    it('saveDisabled is true when form is invalid', () => {
        const fixture = TestBed.createComponent(LoginPasswordChangeComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges(); // This will initialize the viewChild

        const formComponent = component.form();
        if (formComponent) {
            // Leave form empty - it will be invalid due to required validators
            formComponent.form.updateValueAndValidity();
            fixture.detectChanges();
        }

        expect(component.saveDisabled()).toBe(true);
    });

    it('saveDisabled is false when form is valid', () => {
        const fixture = TestBed.createComponent(LoginPasswordChangeComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges(); // This will initialize the viewChild

        const formComponent = component.form();
        if (formComponent) {
            // Set valid values to make form valid
            formComponent.form.patchValue({
                currentPassword: 'current123',
                newPassword: 'newPassword123',
                newRepeatedPassword: 'newPassword123'
            });
            formComponent.form.updateValueAndValidity();
            fixture.detectChanges();
        }

        expect(component.saveDisabled()).toBe(false);
    });

    it('changePassword successful', async () => {
        const testUsername = 'test-username';
        const testNewPassword = 'test-new-password';

        const fixture = TestBed.createComponent(LoginPasswordChangeComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges(); // This will initialize the viewChild

        const formComponent = component.form();
        expect(formComponent).toBeDefined();

        vi.spyOn(formComponent!, 'changePassword').mockReturnValue(of(true));
        vi.spyOn(formComponent!, 'newPassword', 'get').mockReturnValue({ value: testNewPassword } as AbstractControl);
        authServiceSpy.getUsername.mockReturnValue(testUsername);

        const loginResult: LoginResult = { successful: true, passwordChangeRequired: false };
        authServiceSpy.login.mockReturnValue(firstValueFrom(of(loginResult)));

        component.changePassword();

        await vi.waitFor(() => {});

        expect(authServiceSpy.login).toHaveBeenCalledWith(testUsername, testNewPassword);
        expect(routerSpy.navigate).toHaveBeenCalledWith(['uebersicht']);
    });

});
