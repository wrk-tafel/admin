import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DefaultLayoutComponent } from './default-layout.component';
import { AuthenticationService } from '../../security/authentication.service';
import { GlobalStateService } from '../../state/global-state.service';
import { DistributionItem } from '../../../api/distribution-api.service';
import { ConfigApiService } from '../../../api/config-api.service';
import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { TafelTitleStrategy } from '../../util/tafel-title-strategy';
import { By } from '@angular/platform-browser';
import { MatTooltip } from '@angular/material/tooltip';
import { BreakpointObserver } from '@angular/cdk/layout';

// The suite below mostly asserts the desktop ('side' mode) rendering of collapse/expand, which
// has to stay stable regardless of how wide the headless test browser's own window happens to be -
// real runs have seen it land under the component's mobile breakpoint, which previously went
// unnoticed only because `collapsed` drove the template directly. `configureModule` takes a
// `mobile` flag so the one test that needs the overlay ('over' mode) branch instead can reconfigure
// the module itself, since `BreakpointObserver` can't be swapped via `TestBed.overrideProvider`
// once the module has already been compiled.
function breakpointObserverSpy(mobile: boolean): MockedObject<BreakpointObserver> {
    return {
        observe: vi.fn().mockName('BreakpointObserver.observe').mockReturnValue(of({ matches: mobile, breakpoints: {} })),
        isMatched: vi.fn().mockName('BreakpointObserver.isMatched').mockReturnValue(mobile)
    } as unknown as MockedObject<BreakpointObserver>;
}

function configureModule(mobile: boolean) {
    const authServiceSpy = {
        hasPermission: vi.fn().mockName('AuthenticationService.hasPermission'),
        hasAnyPermission: vi.fn().mockName('AuthenticationService.hasAnyPermission')
    };
    const globalStateServiceSpy = {
        getCurrentDistribution: vi.fn().mockName('GlobalStateService.getCurrentDistribution'),
        getConnectionState: vi.fn().mockName('GlobalStateService.getConnectionState').mockReturnValue(signal(false).asReadonly())
    };
    const configApiServiceSpy = {
        observeConfig: vi.fn().mockName('ConfigApiService.observeConfig')
            .mockReturnValue(of({
                version: '1.0.0', buildDate: '2026-07-28', scannerFolderEnabled: true, environmentLabel: ''
            }))
    };

    TestBed.configureTestingModule({
        providers: [
            provideRouter([{path: 'uebersicht', title: 'Übersicht', children: []}]),
            provideLocationMocks(),
            {provide: TitleStrategy, useExisting: TafelTitleStrategy},
            // the header collects the browser's context for a support request, which reads it
            {provide: Window, useValue: window},
            {
                provide: AuthenticationService,
                useValue: authServiceSpy
            },
            {
                provide: GlobalStateService,
                useValue: globalStateServiceSpy
            },
            {
                provide: ConfigApiService,
                useValue: configApiServiceSpy
            },
            {
                provide: BreakpointObserver,
                useValue: breakpointObserverSpy(mobile)
            }
        ]
    }).compileComponents();

    const authService = TestBed.inject(AuthenticationService) as MockedObject<AuthenticationService>;
    const globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;

    globalStateService.getCurrentDistribution.mockReturnValue(signal<DistributionItem | null>(null).asReadonly());

    return {authService, globalStateService};
}

describe('DefaultLayoutComponent', () => {
    let authService: MockedObject<AuthenticationService>;

    let globalStateService: MockedObject<GlobalStateService>;

    beforeEach(() => {
        ({authService, globalStateService} = configureModule(false));
    });

    // A leftover value from one test's persistence would otherwise change what the next test's
    // component reads at construction.
    afterEach(() => {
        localStorage.clear();
    });

    it('should create the component', () => {
        authService.hasAnyPermission.mockReturnValue(false);

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;

        expect(component).toBeTruthy();
    });

    it('exposes the app config from ConfigApiService', () => {
        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.appConfig()).toEqual({
            version: '1.0.0', buildDate: '2026-07-28', scannerFolderEnabled: true, environmentLabel: ''
        });
    });

    it('shows the version footer without a "v" prefix when expanded', () => {
        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        expect(text).toContain('1.0.0');
        expect(text).not.toContain('v1.0.0');
    });

    it('shows the build date without a time', () => {
        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        expect(text).toMatch(/\d{2}\.\d{2}\.\d{4}/);
        expect(text).not.toMatch(/\d{2}:\d{2}/);
    });

    it('hides the version footer when the sidebar is collapsed', () => {
        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;
        component.collapsed.set(true);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).not.toContain('1.0.0');
    });

    // A user who collapsed the sidebar on a wide window has no way to expand it again once the
    // window narrows past the mobile breakpoint - the collapse toggle is `hidden lg:flex`. Without
    // `effectiveCollapsed` gating collapse on `!isMobile()`, the overlay opened on a phone/narrow
    // window would render as the same icon-only rail instead of the full labelled overlay the user
    // guide documents, and a mobile user could never see a label again.
    it('ignores a collapsed preference while the overlay sidenav is in mobile mode', () => {
        TestBed.resetTestingModule();
        const mobileServices = configureModule(true);
        mobileServices.authService.hasPermission.mockReturnValue(true);
        mobileServices.authService.hasAnyPermission.mockReturnValue(true);

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;
        component.collapsed.set(true);
        fixture.detectChanges();

        expect(component.effectiveCollapsed()).toBe(false);
        expect(fixture.nativeElement.querySelector('mat-sidenav').classList).toContain('w-64');
        expect(fixture.nativeElement.textContent).toContain('Übersicht');
        expect(fixture.nativeElement.textContent).toContain('1.0.0');
    });

    it('navItems are filtered by permissions - permissions undefined', () => {
        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;

        const testMenuItem1 = {
            name: 'Test1',
            permissions: ['PERM1']
        };
        const testMenuItem2 = {
            name: 'Test2',
            permissions: ['PERM2']
        };
        const testMenuItems = [testMenuItem1, testMenuItem2];

        const filteredItems = component.filterNavItemsByPermissions(testMenuItems);

        expect(filteredItems).toEqual([]);
    });

    it('navItems are filtered by permissions - permissions null', () => {
        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;

        const filteredItems = component.filterNavItemsByPermissions(null);

        expect(filteredItems).toEqual([]);
    });

    it('navItems are filtered by permissions - permissions empty', () => {
        authService.hasAnyPermission.mockReturnValue(true);

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;

        const filteredItems = component.filterNavItemsByPermissions([]);

        expect(filteredItems).toEqual([]);
    });

    it('navItems are filtered by permissions - permission missing', () => {
        authService.hasPermission.mockReturnValue(false);

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;

        const filteredItems = component.filterNavItemsByPermissions([
            {
                name: 'Test1',
                permissions: ['PERM1']
            }
        ]);

        expect(filteredItems).toEqual([]);
    });

    it('navItems are filtered by permissions - permission given but not required', () => {
        authService.hasPermission.mockReturnValue(true);
        const testMenuItems = [
            {
                name: 'Test1'
            }
        ];

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;

        const filteredItems = component.filterNavItemsByPermissions(testMenuItems);

        expect(filteredItems).toEqual(testMenuItems);
    });

    it('navItems are filtered by permissions - permission given', () => {
        authService.hasPermission.mockReturnValue(true);
        const testMenuItems = [
            {
                name: 'Test1',
                permissions: ['PERM1']
            }
        ];

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;

        const filteredItems = component.filterNavItemsByPermissions(testMenuItems);

        expect(filteredItems).toEqual(testMenuItems);
    });

    it('navItems are filtered by permissions - permission partially given', () => {
        authService.hasPermission.mockImplementation((perm: string) => {
            if (perm === 'PERM1') {
return false;
}
            if (perm === 'PERM2') {
return true;
}
            return false;
        });

        const testMenuItem1 = {
            name: 'Test1',
            permissions: ['PERM1']
        };
        const testMenuItem2 = {
            name: 'Test2',
            permissions: ['PERM2']
        };
        const testMenuItems = [testMenuItem1, testMenuItem2];

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;

        const filteredItems = component.filterNavItemsByPermissions(testMenuItems);

        expect(filteredItems).toEqual([testMenuItem2]);
    });

    it('navItems are filtered by permissions - group keeps only the children the user has permission for', () => {
        authService.hasPermission.mockImplementation((perm: string) => perm === 'PERM2');

        const child1 = {name: 'Child1', url: '/child1', permissions: ['PERM1']};
        const child2 = {name: 'Child2', url: '/child2', permissions: ['PERM2']};
        const testMenuItems = [
            {
                name: 'Group',
                children: [child1, child2]
            }
        ];

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;

        const filteredItems = component.filterNavItemsByPermissions(testMenuItems);

        expect(filteredItems).toEqual([
            {
                name: 'Group',
                children: [child2]
            }
        ]);
    });

    it('navItems are filtered by permissions - group is removed entirely when no child survives', () => {
        authService.hasPermission.mockReturnValue(false);

        const testMenuItems = [
            {
                name: 'Group',
                children: [
                    {name: 'Child1', url: '/child1', permissions: ['PERM1']},
                    {name: 'Child2', url: '/child2', permissions: ['PERM2']}
                ]
            }
        ];

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;

        const filteredItems = component.filterNavItemsByPermissions(testMenuItems);

        expect(filteredItems).toEqual([]);
    });

    it('navItems - empty titles removed', () => {
        const testMenuItem1 = {
            name: 'Test1'
        };
        const testMenuItem2 = {
            name: 'Title2',
            title: true
        };
        const testMenuItem3 = {
            name: 'Test3'
        };
        const testMenuItem4 = {
            name: 'Title4',
            title: true
        };
        const testMenuItem5 = {
            name: 'Title5',
            title: true
        };
        const testMenuItem6 = {
            name: 'Test6'
        };
        const testMenuItem7 = {
            name: 'Title7',
            title: true
        };
        const testMenuItems = [testMenuItem1, testMenuItem2, testMenuItem3, testMenuItem4, testMenuItem5, testMenuItem6, testMenuItem7];

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;

        const filteredItems = component.filterEmptyTitleItems(testMenuItems);

        expect(filteredItems).toEqual([testMenuItem1, testMenuItem2, testMenuItem3, testMenuItem5, testMenuItem6]);
    });

    it('navItems are modified by distribution state when inactive', () => {
        const testMenuItem1 = {
            name: 'Title'
        };
        const testMenuItem2 = {
            name: 'Test2',
            activeDistributionRequired: true
        };
        const testMenuItem3 = {
            name: 'Test3'
        };
        const testMenuItems = [testMenuItem1, testMenuItem2, testMenuItem3];

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;

        const editedItems = component.editNavItemsForDistributionState(testMenuItems, null);

        expect(editedItems).toEqual([
            testMenuItem1, {
                ...testMenuItem2,
                badge: {
                    text: 'INAKTIV',
                    color: 'danger'
                },
                attributes: { disabled: true }
            }, testMenuItem3
        ]);
    });

    it('navItems are not modified by distribution state when active', () => {
        const testDistribution: DistributionItem = {
            id: 123,
            startedAt: new Date()
        };

        const testMenuItem1 = {
            name: 'Title'
        };
        const testMenuItem2 = {
            name: 'Test2',
            activeDistributionRequired: true,
            badge: {
                variant: 'danger',
                text: 'INAKTIV'
            },
            attributes: { disabled: true }
        };

        const testMenuItem2Resetted = {
            name: 'Test2',
            activeDistributionRequired: true
        };

        const testMenuItem3 = {
            name: 'Test3'
        };
        const testMenuItems = [testMenuItem1, testMenuItem2, testMenuItem3];

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;

        const editedItems = component.editNavItemsForDistributionState(testMenuItems, testDistribution);

        expect(editedItems).toEqual([testMenuItem1, testMenuItem2Resetted, testMenuItem3]);
    });

    it('the skip link moves focus to the main landmark', () => {
        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        fixture.detectChanges();

        const skipLink: HTMLAnchorElement = fixture.nativeElement.querySelector('a[testid="skip-to-content"]');
        const main: HTMLElement = fixture.nativeElement.querySelector('main#hauptinhalt');

        skipLink.click();

        expect(main).toBeTruthy();
        expect(document.activeElement).toBe(main);
    });

    // Every screen behind the login shows no page heading of its own, so this is the only `h1` the
    // document has - and a heading structure that starts at `h2` is one a screen reader cannot
    // navigate from the top.
    it('renders the active route title as the pages one visually hidden h1', async () => {
        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        fixture.detectChanges();

        await TestBed.inject(Router).navigate(['/uebersicht']);
        fixture.detectChanges();

        const headings = fixture.nativeElement.querySelectorAll('h1');
        expect(headings.length).toBe(1);
        expect(headings[0].textContent.trim()).toBe('Übersicht');
        expect(headings[0].classList.contains('sr-only')).toBe(true);
    });

    // The whole point of the link is to come before what it skips - inside the sidenav content it
    // would render behind the navigation and be reached only after tabbing through all of it.
    it('the skip link comes before the navigation in the document', () => {
        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        fixture.detectChanges();

        const skipLink: HTMLAnchorElement = fixture.nativeElement.querySelector('a[testid="skip-to-content"]');
        const nav: HTMLElement = fixture.nativeElement.querySelector('nav');

        // eslint-disable-next-line no-bitwise
        expect(skipLink.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('an expandable nav group is a button that reports its expanded state', () => {
        authService.hasPermission.mockReturnValue(true);
        authService.hasAnyPermission.mockReturnValue(true);

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();

        const groupName = component.navItems().find(item => item.children)!.name;
        const toggle: HTMLButtonElement = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('nav button'))
            .find(button => button.textContent!.includes(groupName))!;

        expect(toggle.getAttribute('aria-expanded')).toBe('false');

        toggle.click();
        fixture.detectChanges();

        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(fixture.nativeElement.querySelector('#' + toggle.getAttribute('aria-controls'))).toBeTruthy();
    });

    // The distribution state arrives after the sidebar has first rendered (initial fetch plus the
    // SSE stream), so navItems recomputes while a user may already be tabbing through the menu.
    // Recreating an entry's DOM at that point would drop whatever focus sat on it, which is why the
    // track expression has to keep every entry's identity stable across that recompute.
    it('keeps a nav entrys DOM node across a distribution state change', () => {
        authService.hasPermission.mockReturnValue(true);
        authService.hasAnyPermission.mockReturnValue(true);
        const distribution = signal<DistributionItem | null>(null);
        globalStateService.getCurrentDistribution.mockReturnValue(distribution.asReadonly());

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();

        const groupName = component.navItems().find(item => item.children)!.name;
        const toggleOf = (): HTMLButtonElement =>
            Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('nav button'))
                .find(button => button.textContent!.includes(groupName))!;
        const toggleBefore = toggleOf();

        distribution.set({id: 123, startedAt: new Date()});
        fixture.detectChanges();

        expect(toggleBefore).toBeTruthy();
        expect(toggleOf()).toBe(toggleBefore);
    });

    it('a nav entry disabled by the distribution state leaves the tab order', () => {
        authService.hasPermission.mockReturnValue(true);
        authService.hasAnyPermission.mockReturnValue(true);

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();

        const disabledName = component.navItems().find(item => item.attributes?.disabled)!.name;
        const link: HTMLAnchorElement = Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('nav a'))
            .find(anchor => anchor.textContent!.includes(disabledName))!;

        expect(link.getAttribute('tabindex')).toBe('-1');
        expect(link.getAttribute('aria-disabled')).toBe('true');
    });

    // A vanished entry used to read as "the menu is broken" - the tooltip is what tells a user
    // reaching a disabled entry (expanded, so the name itself is already visible) *why* it's
    // disabled, not just that it is.
    it('names the reason a distribution-gated nav entry is disabled, even while expanded', () => {
        authService.hasPermission.mockReturnValue(true);
        authService.hasAnyPermission.mockReturnValue(true);

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;
        fixture.detectChanges();

        const disabledName = component.navItems().find(item => item.attributes?.disabled)!.name;
        const linkDebugEl = fixture.debugElement.queryAll(By.css('nav a'))
            .find(el => (el.nativeElement as HTMLElement).textContent!.includes(disabledName))!;

        expect(linkDebugEl.injector.get(MatTooltip).message).toBe('Keine Verteilung aktiv');
    });

    // "Einstellungen" mixes logistics master data with system administration - the sub-group labels
    // are what makes the right entry findable without reading all ten flat entries.
    it('splits the Einstellungen submenu into labeled sub-groups instead of one flat list', () => {
        authService.hasPermission.mockReturnValue(true);
        authService.hasAnyPermission.mockReturnValue(true);

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        fixture.detectChanges();

        const settingsToggle: HTMLButtonElement = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('nav button'))
            .find(button => button.textContent!.includes('Einstellungen'))!;
        settingsToggle.click();
        fixture.detectChanges();

        const group: HTMLElement = fixture.nativeElement.querySelector('#nav-group-' + fixture.componentInstance.navItems()
            .findIndex(item => item.name === 'Einstellungen'));
        const labels = Array.from(group.querySelectorAll('div')).map(el => el.textContent!.trim());
        expect(labels).toEqual(['Stammdaten', 'Systemverwaltung']);

        // the sub-group labels are not links - only the actual entries are
        const links = Array.from<HTMLAnchorElement>(group.querySelectorAll('a')).map(a => a.textContent!.trim());
        expect(links).toEqual([
            'Fahrzeuge', 'Filialen', 'Länder', 'Notschlafstellen', 'Routen', 'Waren-Kategorien', 'Retour-Kategorien',
            'E-Mail', 'Grenzwerte', 'Mitarbeiter'
        ]);
    });

    it('remembers the collapsed sidebar across a reload', () => {
        const firstFixture = TestBed.createComponent(DefaultLayoutComponent);
        firstFixture.detectChanges();
        firstFixture.componentInstance.toggleCollapsed();
        // the persisting effect runs on the next change detection, not synchronously on the signal write
        firstFixture.detectChanges();

        expect(localStorage.getItem('tafel.sidenav.collapsed')).toBe('true');

        const secondFixture = TestBed.createComponent(DefaultLayoutComponent);
        expect(secondFixture.componentInstance.collapsed()).toBe(true);
    });

    it('remembers an expanded nav group across a reload', () => {
        authService.hasPermission.mockReturnValue(true);
        authService.hasAnyPermission.mockReturnValue(true);

        const firstFixture = TestBed.createComponent(DefaultLayoutComponent);
        firstFixture.detectChanges();
        const groupName = firstFixture.componentInstance.navItems().find(item => item.children)!.name;
        firstFixture.componentInstance.toggleExpanded(groupName);
        firstFixture.detectChanges();

        expect(JSON.parse(localStorage.getItem('tafel.sidenav.expandedGroups')!)).toEqual([groupName]);

        const secondFixture = TestBed.createComponent(DefaultLayoutComponent);
        expect(secondFixture.componentInstance.expandedItems().has(groupName)).toBe(true);
    });

});
