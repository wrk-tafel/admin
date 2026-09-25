import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { UserAccountComponent } from './user-account.component';

@Component({template: 'passwort-tab'})
class PasswordStubComponent {}

@Component({template: 'design-tab'})
class ThemeStubComponent {}

describe('UserAccountComponent', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter([{
                    path: 'konto',
                    component: UserAccountComponent,
                    children: [
                        {path: 'passwort', component: PasswordStubComponent},
                        {path: 'design', component: ThemeStubComponent}
                    ]
                }])
            ]
        });
    });

    it('has a tab per topic, and marks the one that is open', async () => {
        const harness = await RouterTestingHarness.create('/konto/passwort');
        harness.detectChanges(); // the active state is applied after the first pass
        const root: HTMLElement = harness.routeNativeElement!;

        const labels = Array.from(root.querySelectorAll('[mat-tab-link]')).map(link => link.textContent!.trim());
        expect(labels).toEqual(['Meine Daten', 'Passwort', 'Zwei-Faktor-Authentifizierung', 'Benachrichtigungen', 'Design', 'Datenschutz']);
        expect(root.querySelector('[testid="account-tab-password"]')!.classList).toContain('mdc-tab--active');
        expect(root.textContent).toContain('passwort-tab');
    });

    it('shows the topic of the tab that is opened', async () => {
        const harness = await RouterTestingHarness.create('/konto/passwort');

        await TestBed.inject(Router).navigateByUrl('/konto/design');
        harness.detectChanges();

        const root: HTMLElement = harness.routeNativeElement!;
        expect(root.textContent).toContain('design-tab');
        expect(root.querySelector('[testid="account-tab-theme"]')!.classList).toContain('mdc-tab--active');
    });
});
