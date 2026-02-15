import { TestBed } from '@angular/core/testing';
import { UserPasswordChangeComponent } from './user-passwordchange.component';
import { of } from 'rxjs';
import { CardModule } from '@coreui/angular';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PasswordChangeFormComponent } from '../../../../common/views/passwordchange-form/passwordchange-form.component';

describe('UserPasswordChangeComponent', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                CardModule
            ],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        }).compileComponents();
    });

    it('component can be created', () => {
        const fixture = TestBed.createComponent(UserPasswordChangeComponent);
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

    it('changePassword', () => {
        const fixture = TestBed.createComponent(UserPasswordChangeComponent);
        const component = fixture.componentInstance;
        component.form = TestBed.createComponent(PasswordChangeFormComponent).componentInstance;
        vi.spyOn(component.form, 'changePassword').mockReturnValue(of(true));

        component.changePassword();

        expect(component.form.changePassword).toHaveBeenCalled();
    });

    it('isSaveDisabled - form valid', () => {
        const fixture = TestBed.createComponent(UserPasswordChangeComponent);
        const component = fixture.componentInstance;
        component.form = TestBed.createComponent(PasswordChangeFormComponent).componentInstance;
        vi.spyOn(component.form, 'isValid').mockReturnValue(true);
        vi.spyOn(component.form.form, 'valid', 'get').mockReturnValue(true);

        expect(component.isSaveDisabled()).toBeFalsy();
    });

    it('isSaveDisabled - form invalid', () => {
        const fixture = TestBed.createComponent(UserPasswordChangeComponent);
        const component = fixture.componentInstance;
        component.form = TestBed.createComponent(PasswordChangeFormComponent).componentInstance;
        vi.spyOn(component.form, 'isValid').mockReturnValue(false);
        vi.spyOn(component.form.form, 'valid', 'get').mockReturnValue(false);

        expect(component.isSaveDisabled()).toBeTruthy();
    });

});
