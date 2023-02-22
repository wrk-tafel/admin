import {TestBed, waitForAsync} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {DefaultLayoutComponent} from './default-layout.component';
import {AuthenticationService} from '../../security/authentication.service';
import {
  AppHeaderComponent,
  AppSidebarComponent,
  AppSidebarMinimizerComponent,
  AppSidebarNavComponent
} from '@coreui/angular';
import {DistributionApiService} from "../../../api/distribution-api.service";
import {of} from "rxjs";

describe('DefaultLayoutComponent', () => {
  let authService: jasmine.SpyObj<AuthenticationService>;
  let distributionApiService: jasmine.SpyObj<DistributionApiService>;

  beforeEach(waitForAsync(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthenticationService', ['hasPermission', 'hasAnyPermission']);
    const distributionApiServiceSpy = jasmine.createSpyObj('DistributionApiService', ['getCurrentDistribution']);

    TestBed.configureTestingModule({
      declarations: [
        AppHeaderComponent,
        AppSidebarComponent,
        AppSidebarNavComponent,
        AppSidebarMinimizerComponent,
        DefaultLayoutComponent
      ],
      providers: [
        {
          provide: AuthenticationService,
          useValue: authServiceSpy
        },
        {
          provide: DistributionApiService,
          useValue: distributionApiServiceSpy
        }
      ],
      imports: [RouterTestingModule]
    }).compileComponents();

    authService = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
    distributionApiService = TestBed.inject(DistributionApiService) as jasmine.SpyObj<DistributionApiService>;
  }));

  it('should create the component', waitForAsync(() => {
    authService.hasAnyPermission.and.returnValue(false);

    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  }));

  // TODO add test for sideBarMinimize

  it('navItems are filtered by permissions - permissions undefined', () => {
    authService.hasAnyPermission.and.returnValue(false);

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
    authService.hasAnyPermission.and.returnValue(true);

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
    authService.hasAnyPermission.and.returnValue(true);
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
    authService.hasAnyPermission.and.returnValue(true);
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
    authService.hasAnyPermission.and.returnValue(true);
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
    authService.hasAnyPermission.and.returnValue(true);
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

  it('navItems are filtered by permissions - permission partially given and empty titles removed', waitForAsync(() => {
    authService.hasPermission.and.returnValue(false);
    authService.hasAnyPermission.and.returnValue(true);
    authService.hasPermission.withArgs('PERM1').and.returnValue(true);
    authService.hasPermission.withArgs('PERM2').and.returnValue(false);

    const testMenuItem1 = {
      name: 'Test1',
      permissions: ['PERM1']
    };
    const testMenuItem2 = {
      name: 'Title2',
      title: true
    };
    const testMenuItem3 = {
      name: 'Test3',
      permissions: ['PERM2']
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
      name: 'Test6',
      permissions: ['PERM1']
    };
    const testMenuItem7 = {
      name: 'Title7',
      title: true
    };
    const testMenuItems = [testMenuItem1, testMenuItem2, testMenuItem3, testMenuItem4, testMenuItem5, testMenuItem6, testMenuItem7];

    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    const component = fixture.componentInstance;

    const filteredItems = component.filterNavItemsByPermissions(testMenuItems);

    expect(filteredItems).toEqual([testMenuItem1, testMenuItem5, testMenuItem6]);
  }));

  it('navItems are filtered by permissions - empty titles removed on single title', waitForAsync(() => {
    authService.hasPermission.and.returnValue(false);
    authService.hasAnyPermission.and.returnValue(true);
    authService.hasPermission.withArgs('PERM2').and.returnValue(false);

    const testMenuItem1 = {
      name: 'Title',
      title: true
    };
    const testMenuItem2 = {
      name: 'Test2',
      permissions: ['PERM2']
    };
    const testMenuItems = [testMenuItem1, testMenuItem2];

    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    const component = fixture.componentInstance;

    const filteredItems = component.filterNavItemsByPermissions(testMenuItems);

    expect(filteredItems).toEqual([]);
  }));

  it('navItems are modified by distribution state', () => {
    distributionApiService.getCurrentDistribution.and.returnValue(of(null));

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

    component.editNavItemsForDistributionState();

    expect(component.navItems).toEqual([
      testMenuItem1, {
        ...testMenuItem2,
        badge: {
          variant: 'danger',
          text: 'INAKTIV'
        },
        attributes: {disabled: true}
      }, testMenuItem3
    ]);
  });

});
