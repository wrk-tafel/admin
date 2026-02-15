import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { DefaultLayoutComponent } from './default-layout.component';
import { AuthenticationService } from '../../security/authentication.service';
import { ContainerComponent, HeaderNavComponent, SidebarModule } from '@coreui/angular';
import { GlobalStateService } from '../../state/global-state.service';
import { DistributionItem } from '../../../api/distribution-api.service';
import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';

describe('DefaultLayoutComponent', () => {
    let authService: MockedObject<AuthenticationService>;
    /* eslint-disable @typescript-eslint/no-unused-vars */
    let globalStateService: MockedObject<GlobalStateService>;

    beforeEach(() => {
        const authServiceSpy = {
            hasPermission: vi.fn().mockName("AuthenticationService.hasPermission"),
            hasAnyPermission: vi.fn().mockName("AuthenticationService.hasAnyPermission")
        };
        const globalStateServiceSpy = {
            getCurrentDistribution: vi.fn().mockName("GlobalStateService.getCurrentDistribution"),
            getConnectionState: vi.fn().mockName("GlobalStateService.getConnectionState").mockReturnValue(signal(false).asReadonly())
        };

        TestBed.configureTestingModule({
            imports: [
                SidebarModule,
                ContainerComponent,
                HeaderNavComponent
            ],
            providers: [
                provideRouter([]),
                provideLocationMocks(),
                {
                    provide: AuthenticationService,
                    useValue: authServiceSpy
                },
                {
                    provide: GlobalStateService,
                    useValue: globalStateServiceSpy
                }
            ]
        }).compileComponents();

        authService = TestBed.inject(AuthenticationService) as MockedObject<AuthenticationService>;
        globalStateService = TestBed.inject(GlobalStateService) as MockedObject<GlobalStateService>;

        globalStateService.getCurrentDistribution.mockReturnValue(signal<DistributionItem>(null).asReadonly());
    });

    it('should create the component', () => {
        authService.hasAnyPermission.mockReturnValue(false);

        const fixture = TestBed.createComponent(DefaultLayoutComponent);
        const component = fixture.componentInstance;

        expect(component).toBeTruthy();
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
            if (perm === 'PERM1') return false;
            if (perm === 'PERM2') return true;
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

});
