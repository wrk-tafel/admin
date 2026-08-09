import { TestBed } from '@angular/core/testing';
import { UserPasswordChangeComponent } from './user-passwordchange.component';
import { of } from 'rxjs';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfigApiService } from '../../../../api/config-api.service';

describe('UserPasswordChangeComponent', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                {
                    provide: ConfigApiService,
                    useValue: {
                        observeConfig: vi.fn().mockName('ConfigApiService.observeConfig').mockReturnValue(of(null))
                    }
                }
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
        fixture.detectChanges(); // initializes the viewChild

        const formComponent = component.form();
        expect(formComponent).toBeDefined();
        vi.spyOn(formComponent!, 'changePassword').mockReturnValue(of(true));

        component.changePassword();

        expect(formComponent!.changePassword).toHaveBeenCalled();
    });

    it('isSaveDisabled - form valid', () => {
        const fixture = TestBed.createComponent(UserPasswordChangeComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges(); // initializes the viewChild

        const formComponent = component.form();

        // Mock passwordForm to return a valid state
        vi.spyOn(formComponent!, 'passwordForm').mockReturnValue({
            valid: vi.fn().mockReturnValue(true)
        } as any);

        expect(component.isSaveDisabled()).toBeFalsy();
    });

    it('isSaveDisabled - form invalid', () => {
        const fixture = TestBed.createComponent(UserPasswordChangeComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges(); // initializes the viewChild

        const formComponent = component.form();

        // Mock passwordForm to return an invalid state
        vi.spyOn(formComponent!, 'passwordForm').mockReturnValue({
            valid: vi.fn().mockReturnValue(false)
        } as any);

        expect(component.isSaveDisabled()).toBeTruthy();
    });

});
