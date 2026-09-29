import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {SettingsOverviewComponent} from './settings-overview.component';
import {AuthenticationService} from '../../../../common/security/authentication.service';

describe('SettingsOverviewComponent', () => {
  let permissions: string[];

  function render(): HTMLElement {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {provide: AuthenticationService, useValue: {hasPermission: (p: string) => permissions.includes(p)}}
      ]
    });
    const fixture = TestBed.createComponent(SettingsOverviewComponent);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  const headings = (el: HTMLElement) => Array.from(el.querySelectorAll('h2')).map(h => h.textContent!.trim());
  const links = (el: HTMLElement) => Array.from(el.querySelectorAll('a')).map(a => a.getAttribute('href'));

  it('lists every screen under its topic for an administrator', () => {
    permissions = ['SETTINGS', 'ADMINISTRATOR'];

    const el = render();

    expect(headings(el)).toEqual(['Logistik', 'Kunden & Betreuung', 'System']);
    expect(links(el)).toHaveLength(12);
    expect(links(el)).toContain('/einstellungen/anstehende-loeschungen');
  });

  it('leaves out the administrator-only screens for a user with SETTINGS alone', () => {
    permissions = ['SETTINGS'];

    const el = render();

    expect(links(el)).toHaveLength(10);
    expect(links(el)).not.toContain('/einstellungen/ankuendigungen');
    expect(links(el)).not.toContain('/einstellungen/anstehende-loeschungen');
    expect(links(el)).toContain('/einstellungen/email');
  });
});
