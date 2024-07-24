import {TestBed, waitForAsync} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {DefaultLayoutComponent} from './default-layout.component';
import {AuthenticationService} from '../../security/authentication.service';
import {ContainerComponent, HeaderNavComponent, SidebarModule} from '@coreui/angular';
import {GlobalStateService} from '../../state/global-state.service';
import {DefaultHeaderComponent} from './default-header/default-header.component';
import {DistributionItem} from '../../../api/distribution-api.service';
import {BehaviorSubject} from 'rxjs';

describe('DefaultLayoutComponent', () => {
  let authService: jasmine.SpyObj<AuthenticationService>;
  /* eslint-disable @typescript-eslint/no-unused-vars */
  let globalStateService: jasmine.SpyObj<GlobalStateService>;

  beforeEach(waitForAsync(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthenticationService', ['hasPermission', 'hasAnyPermission']);
    const globalStateServiceSpy = jasmine.createSpyObj('GlobalStateService', ['getCurrentDistribution']);

    TestBed.configureTestingModule({
      imports: [
        SidebarModule,
        RouterTestingModule,
        ContainerComponent,
        HeaderNavComponent
      ],
      providers: [
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

    authService = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
    globalStateService = TestBed.inject(GlobalStateService) as jasmine.SpyObj<GlobalStateService>;

    globalStateService.getCurrentDistribution.and.returnValue(new BehaviorSubject<DistributionItem>(null));
  }));

  it('should create the component', waitForAsync(() => {
    authService.hasAnyPermission.and.returnValue(false);

    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  }));

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
    authService.hasAnyPermission.and.returnValue(true);

    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    const component = fixture.componentInstance;

    const filteredItems = component.filterNavItemsByPermissions([]);

    expect(filteredItems).toEqual([]);
  });

  it('navItems are filtered by permissions - permission missing', () => {
    authService.hasPermission.and.returnValue(false);

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
    authService.hasPermission.and.returnValue(true);
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
    authService.hasPermission.and.returnValue(true);
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

  it('navItems are filtered by permissions - permission partially given', waitForAsync(() => {
    authService.hasPermission.and.returnValue(false);
    authService.hasPermission.withArgs('PERM1').and.returnValue(false);
    authService.hasPermission.withArgs('PERM2').and.returnValue(true);

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
  }));

  it('navItems - empty titles removed', waitForAsync(() => {
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
  }));

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
    component.navItems = testMenuItems;

    const editedItems = component.editNavItemsForDistributionState(testMenuItems, null);

    expect(editedItems).toEqual([
      testMenuItem1, {
        ...testMenuItem2,
        badge: {
          text: 'INAKTIV',
          color: 'danger'
        },
        attributes: {disabled: true}
      }, testMenuItem3
    ]);
  });

  it('navItems are not modified by distribution state when active', () => {
    const testDistribution = {
      id: 123,
      state: {
        name: 'OPEN',
        stateLabel: 'Offen',
        actionLabel: 'Offen'
      }
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
      attributes: {disabled: true}
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
    component.navItems = testMenuItems;

    const editedItems = component.editNavItemsForDistributionState(testMenuItems, testDistribution);

    expect(editedItems).toEqual([testMenuItem1, testMenuItem2Resetted, testMenuItem3]);
  });

});
