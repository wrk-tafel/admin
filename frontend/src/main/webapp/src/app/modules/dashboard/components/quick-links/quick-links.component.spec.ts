import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {By} from '@angular/platform-browser';
import {QuickLinksComponent} from './quick-links.component';
import {AuthenticationService} from '../../../../common/security/authentication.service';

describe('QuickLinksComponent', () => {
  let permissions: string[];

  beforeEach(() => {
    permissions = [];

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthenticationService,
          useValue: {hasPermission: (permission: string) => permissions.includes(permission)}
        }
      ]
    }).compileComponents();
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(QuickLinksComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('only renders links the user has permission for', () => {
    permissions = ['CUSTOMER'];

    const fixture = TestBed.createComponent(QuickLinksComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="quick-link-customers-search"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[testid="quick-link-customers-create"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[testid="quick-link-customers-quickcheck"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[testid="quick-link-users-search"]'))).toBeFalsy();
    expect(fixture.debugElement.query(By.css('[testid="quick-link-settings"]'))).toBeFalsy();
  });

  it('renders a placeholder when no links are permitted', () => {
    const fixture = TestBed.createComponent(QuickLinksComponent);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testid="quick-links-empty"]'))).toBeTruthy();
  });

});
