import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { UserThemeSettingsComponent } from './user-theme-settings.component';
import { ThemeService } from '../../../../common/theme/theme.service';

describe('UserThemeSettingsComponent', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withXhr()), provideHttpClientTesting()]
        });
    });

    it('offers light, dark and system, with the saved choice selected', () => {
        TestBed.inject(ThemeService).adopt('DARK');

        const fixture = TestBed.createComponent(UserThemeSettingsComponent);
        fixture.detectChanges();

        const root: HTMLElement = fixture.nativeElement;
        for (const value of ['light', 'dark', 'system']) {
            expect(root.querySelector(`[testid="theme-option-${value}"]`)).not.toBeNull();
        }
        expect(root.querySelector('[testid="theme-option-dark"]')!.classList).toContain('mat-mdc-radio-checked');
        expect(root.querySelector('[testid="theme-option-light"]')!.classList).not.toContain('mat-mdc-radio-checked');
    });

    it('saves a new choice', () => {
        const themeService = TestBed.inject(ThemeService);
        const setPreference = vi.spyOn(themeService, 'setPreference').mockResolvedValue(undefined);

        const fixture = TestBed.createComponent(UserThemeSettingsComponent);
        fixture.detectChanges();

        (fixture.nativeElement.querySelector('[testid="theme-option-light"] input') as HTMLInputElement).click();

        expect(setPreference).toHaveBeenCalledWith('LIGHT');
    });
});
