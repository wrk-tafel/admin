import {TestBed, waitForAsync} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {DefaultLayoutComponent} from './default-layout.component';
import {AuthenticationService} from '../../../common/security/authentication.service';
import {
  AppHeaderComponent,
  AppSidebarComponent,
  AppSidebarMinimizerComponent,
  AppSidebarNavComponent
} from '@coreui/angular';

describe('DefaultLayoutComponent', () => {
  let authService: jasmine.SpyObj<AuthenticationService>;

  beforeEach(waitForAsync(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthenticationService', ['hasPermission']);

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
        }
      ],
      imports: [RouterTestingModule]
    }).compileComponents();

    authService = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  }));

  // TODO add test for sideBarMinimize

  it('navItems are filtered by permissions - permissions undefined', () => {
    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    const component = fixture.componentInstance;

    const filteredItems = component.getNavItemsFilteredByPermissions(undefined);
    expect(filteredItems).toEqual([]);
  });

  it('navItems are filtered by permissions - permissions null', () => {
    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    const component = fixture.componentInstance;

    const filteredItems = component.getNavItemsFilteredByPermissions(null);
    expect(filteredItems).toEqual([]);
  });

  it('navItems are filtered by permissions - permissions empty', () => {
    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    const component = fixture.componentInstance;

    const filteredItems = component.getNavItemsFilteredByPermissions([]);
    expect(filteredItems).toEqual([]);
  });

  it('navItems are filtered by permissions - permission missing', () => {
    authService.hasPermission.and.returnValue(false);

    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    const component = fixture.componentInstance;

    const filteredItems = component.getNavItemsFilteredByPermissions([
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

    const filteredItems = component.getNavItemsFilteredByPermissions(testMenuItems);

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

    const filteredItems = component.getNavItemsFilteredByPermissions(testMenuItems);

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

    const filteredItems = component.getNavItemsFilteredByPermissions(testMenuItems);

    expect(filteredItems).toEqual([testMenuItem2]);
  }));

  it('navItems are filtered by permissions - permission partially given and empty titles removed', waitForAsync(() => {
    authService.hasPermission.and.returnValue(false);
    authService.hasPermission.withArgs('PERM1').and.returnValue(true);
    authService.hasPermission.withArgs('PERM2').and.returnValue(false);

    const testMenuItem1 = {
      name: 'Test1',
      permissions: ['PERM1']
    };
    const testMenuItem2 = {
      name: 'Title',
      title: true
    };
    const testMenuItem3 = {
      name: 'Test3',
      permissions: ['PERM2']
    };
    const testMenuItem4 = {
      name: 'Test4',
      title: true
    };
    const testMenuItem5 = {
      name: 'Test5',
      permissions: ['PERM1']
    };
    const testMenuItem6 = {
      name: 'Title',
      title: true
    };
    const testMenuItems = [testMenuItem1, testMenuItem2, testMenuItem3, testMenuItem4, testMenuItem5, testMenuItem6];

    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    const component = fixture.componentInstance;

    const filteredItems = component.getNavItemsFilteredByPermissions(testMenuItems);

    expect(filteredItems).toEqual([testMenuItem1, testMenuItem4, testMenuItem5, testMenuItem6]);
  }));

  it('navItems are filtered by permissions - empty titles removed on single title', waitForAsync(() => {
    authService.hasPermission.and.returnValue(false);
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

    const filteredItems = component.getNavItemsFilteredByPermissions(testMenuItems);

    expect(filteredItems).toEqual([]);
  }));

});
