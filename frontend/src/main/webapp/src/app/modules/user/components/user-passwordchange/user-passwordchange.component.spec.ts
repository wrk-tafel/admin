import type {MockedObject} from 'vitest';
import { TestBed } from '@angular/core/testing';
import { UserPasswordChangeComponent } from './user-passwordchange.component';
import { of, throwError } from 'rxjs';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { TafelToastrService } from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('UserPasswordChangeComponent', () => {
    let routerSpy: MockedObject<Router>;
    let toastrSpy: MockedObject<TafelToastrService>;

    function configureTestingModule(previousUrl?: string) {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                // This Router mock also covers AuthenticationService, which the shared
                // tafel-passwordchange-form injects for its live password-rule checklist.
                {
                    provide: Router,
                    useValue: {
                        navigateByUrl: vi.fn().mockName('Router.navigateByUrl'),
                        getCurrentNavigation: vi.fn().mockName('Router.getCurrentNavigation').mockReturnValue({
                            previousNavigation: previousUrl ? {finalUrl: {toString: () => previousUrl}} : null
                        })
                    }
                },
                {
                    provide: TafelToastrService,
                    useValue: {
                        success: vi.fn().mockName('TafelToastrService.success')
                    }
                }
            ]
        }).compileComponents();

        routerSpy = TestBed.inject(Router) as MockedObject<Router>;
        toastrSpy = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;
    }

    it('component can be created', () => {
        configureTestingModule();

        const fixture = TestBed.createComponent(UserPasswordChangeComponent);
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

    it('changePassword returns to the previous screen and reports that the session stays valid', () => {
        configureTestingModule('/kunden/suchen');

        const fixture = TestBed.createComponent(UserPasswordChangeComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges(); // initializes the viewChild

        const formComponent = component.form();
        expect(formComponent).toBeDefined();
        vi.spyOn(formComponent!, 'changePassword').mockReturnValue(of(true));

        component.changePassword();

        expect(formComponent!.changePassword).toHaveBeenCalled();
        expect(toastrSpy.success).toHaveBeenCalledWith('Sie bleiben mit dem neuen Passwort angemeldet.', 'Passwort geändert');
        expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/kunden/suchen');
    });

    it('changePassword stays on the page when the change was rejected', () => {
        configureTestingModule('/kunden/suchen');

        const fixture = TestBed.createComponent(UserPasswordChangeComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges(); // initializes the viewChild

        const formComponent = component.form();
        vi.spyOn(formComponent!, 'changePassword').mockReturnValue(throwError(() => false));

        component.changePassword();

        expect(toastrSpy.success).not.toHaveBeenCalled();
        expect(routerSpy.navigateByUrl).not.toHaveBeenCalled();
    });

    it('cancel returns to the previous screen', () => {
        configureTestingModule('/kunden/suchen');

        const fixture = TestBed.createComponent(UserPasswordChangeComponent);
        const component = fixture.componentInstance;

        component.cancel();

        expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/kunden/suchen');
    });

    it('cancel falls back to the overview when the page was opened directly', () => {
        configureTestingModule();

        const fixture = TestBed.createComponent(UserPasswordChangeComponent);
        const component = fixture.componentInstance;

        component.cancel();

        expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/uebersicht');
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
