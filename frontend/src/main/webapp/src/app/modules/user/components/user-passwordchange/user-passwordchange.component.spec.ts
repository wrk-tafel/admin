import type {MockedObject} from 'vitest';
import { TestBed } from '@angular/core/testing';
import { UserPasswordChangeComponent } from './user-passwordchange.component';
import { of, throwError } from 'rxjs';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { TafelToastrService } from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('UserPasswordChangeComponent', () => {
    let toastrSpy: MockedObject<TafelToastrService>;

    function configureTestingModule() {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                // This Router mock also covers AuthenticationService, which the shared
                // tafel-passwordchange-form injects for its live password-rule checklist.
                { provide: Router, useValue: {} },
                {
                    provide: TafelToastrService,
                    useValue: {
                        success: vi.fn().mockName('TafelToastrService.success')
                    }
                }
            ]
        }).compileComponents();

        toastrSpy = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
    }

    it('component can be created', () => {
        configureTestingModule();

        const fixture = TestBed.createComponent(UserPasswordChangeComponent);
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

    it('changePassword reports that the session stays valid and empties the fields', () => {
        configureTestingModule();

        const fixture = TestBed.createComponent(UserPasswordChangeComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges(); // initializes the viewChild

        const formComponent = component.form();
        expect(formComponent).toBeDefined();
        formComponent!.passwordFormModel.set({
            currentPassword: 'current123',
            newPassword: 'newPassword123',
            newRepeatedPassword: 'newPassword123'
        });
        vi.spyOn(formComponent!, 'changePassword').mockReturnValue(of(true));

        component.changePassword();

        expect(formComponent!.changePassword).toHaveBeenCalled();
        expect(toastrSpy.success).toHaveBeenCalledWith('Sie bleiben mit dem neuen Passwort angemeldet.', 'Passwort geändert');
        expect(formComponent!.passwordFormModel()).toEqual({currentPassword: '', newPassword: '', newRepeatedPassword: ''});
    });

    it('changePassword keeps the fields when the change was rejected', () => {
        configureTestingModule();

        const fixture = TestBed.createComponent(UserPasswordChangeComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges(); // initializes the viewChild

        const formComponent = component.form();
        formComponent!.passwordFormModel.set({
            currentPassword: 'current123',
            newPassword: 'newPassword123',
            newRepeatedPassword: 'newPassword123'
        });
        vi.spyOn(formComponent!, 'changePassword').mockReturnValue(throwError(() => false));

        component.changePassword();

        expect(toastrSpy.success).not.toHaveBeenCalled();
        expect(formComponent!.passwordFormModel().currentPassword).toBe('current123');
    });

    it('saveDisabled - form valid', () => {
        configureTestingModule();

        const fixture = TestBed.createComponent(UserPasswordChangeComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges(); // initializes the viewChild

        component.form()!.passwordFormModel.set({
            currentPassword: 'current123',
            newPassword: 'newPassword123',
            newRepeatedPassword: 'newPassword123'
        });
        fixture.detectChanges();

        expect(component.saveDisabled()).toBeFalsy();
    });

    it('saveDisabled - form invalid', () => {
        configureTestingModule();

        const fixture = TestBed.createComponent(UserPasswordChangeComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges(); // initializes the viewChild - the form starts out empty and invalid

        expect(component.saveDisabled()).toBeTruthy();
    });

});
