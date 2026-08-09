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

describe('DefaultLayoutComponent', () => {
    let authService: MockedObject<AuthenticationService>;

    let globalStateService: MockedObject<GlobalStateService>;

    beforeEach(() => {
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
                .mockReturnValue(of({version: '1.0.0', buildTime: '2026-07-28T15:30:00Z', scannerFolderEnabled: true}))
        };

        TestBed.configureTestingModule({
            providers: [
                provideRouter([{path: 'uebersicht', title: 'Übersicht', children: []}]),
                provideLocationMocks(),
                {provide: TitleStrategy, useExisting: TafelTitleStrategy},
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
                }
            ]
        }).compileComponents();

        authService = TestBed.inject(AuthenticationService) as MockedObject<AuthenticationService>;
        globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;

        globalStateService.getCurrentDistribution.mockReturnValue(signal<DistributionItem | null>(null).asReadonly());
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

        expect(component.appConfig()).toEqual({version: '1.0.0', buildTime: '2026-07-28T15:30:00Z', scannerFolderEnabled: true});
    });

    it('shows the version footer without a "v" prefix when expanded', () => {
        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        expect(text).toContain('1.0.0');
        expect(text).not.toContain('v1.0.0');
    });

    it('hides the version footer when the sidebar is collapsed', () => {
        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;
        component.collapsed.set(true);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).not.toContain('1.0.0');
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

});
