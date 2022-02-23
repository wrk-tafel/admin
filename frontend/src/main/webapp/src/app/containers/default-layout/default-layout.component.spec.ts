import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { DefaultLayoutComponent } from '.';
import { AuthenticationService } from '../../common/security/authentication.service';

describe('DefaultLayoutComponent', () => {
  let authService: jasmine.SpyObj<AuthenticationService>;

  beforeEach(waitForAsync(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthenticationService', ['hasPermission']);

    TestBed.configureTestingModule({
      declarations: [
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

  it('should create the app', waitForAsync(() => {
    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));

  it('navItems are filtered by permissions - permissions undefined', () => {
    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    let component = fixture.componentInstance;

    let filteredItems = component.getNavItemsFilteredByPermissions(undefined);
    expect(filteredItems).toEqual([])
  });

  it('navItems are filtered by permissions - permissions null', () => {
    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    let component = fixture.componentInstance;

    let filteredItems = component.getNavItemsFilteredByPermissions(null);
    expect(filteredItems).toEqual([])
  });

  it('navItems are filtered by permissions - permissions empty', () => {
    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    let component = fixture.componentInstance;

    let filteredItems = component.getNavItemsFilteredByPermissions([]);
    expect(filteredItems).toEqual([])
  });

  it('navItems are filtered by permissions - permission missing', () => {
    authService.hasPermission.and.returnValue(false);

    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    let component = fixture.componentInstance;

    let filteredItems = component.getNavItemsFilteredByPermissions([
      {
        name: 'Test1',
        permissions: ['PERM1']
      }
    ]);

    expect(filteredItems).toEqual([])
  });

  it('navItems are filtered by permissions - permission given but not required', () => {
    authService.hasPermission.and.returnValue(true);
    let testMenuItems = [
      {
        name: 'Test1'
      }
    ];

    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    let component = fixture.componentInstance;

    let filteredItems = component.getNavItemsFilteredByPermissions(testMenuItems);

    expect(filteredItems).toEqual(testMenuItems)
  });

  it('navItems are filtered by permissions - permission given', () => {
    authService.hasPermission.and.returnValue(true);
    let testMenuItems = [
      {
        name: 'Test1',
        permissions: ['PERM1']
      }
    ];

    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    let component = fixture.componentInstance;

    let filteredItems = component.getNavItemsFilteredByPermissions(testMenuItems);

    expect(filteredItems).toEqual(testMenuItems)
  });

  it('navItems are filtered by permissions - permission partially given', waitForAsync(() => {
    authService.hasPermission.and.returnValue(false);
    authService.hasPermission.withArgs('PERM1').and.returnValue(false);
    authService.hasPermission.withArgs('PERM2').and.returnValue(true);

    let testMenuItem1 = {
      name: 'Test1',
      permissions: ['PERM1']
    };
    let testMenuItem2 = {
      name: 'Test2',
      permissions: ['PERM2']
    };
    let testMenuItems = [testMenuItem1, testMenuItem2];

    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    let component = fixture.componentInstance;

    let filteredItems = component.getNavItemsFilteredByPermissions(testMenuItems);

    expect(filteredItems).toEqual([testMenuItem2])
  }));

  it('navItems are filtered by permissions - permission partially given and empty titles deleted', waitForAsync(() => {
    authService.hasPermission.and.returnValue(false);
    authService.hasPermission.withArgs('PERM1').and.returnValue(true);
    authService.hasPermission.withArgs('PERM2').and.returnValue(false);

    let testMenuItem1 = {
      name: 'Test1',
      permissions: ['PERM1']
    };
    let testMenuItem2 = {
      name: 'Title',
      title: true
    };
    let testMenuItem3 = {
      name: 'Test3',
      permissions: ['PERM2']
    };
    let testMenuItem4 = {
      name: 'Test4',
      title: true
    };
    let testMenuItem5 = {
      name: 'Test5',
      permissions: ['PERM1']
    };
    let testMenuItem6 = {
      name: 'Title',
      title: true
    };
    let testMenuItems = [testMenuItem1, testMenuItem2, testMenuItem3, testMenuItem4, testMenuItem5, testMenuItem6];

    const fixture = TestBed.createComponent(DefaultLayoutComponent);
    let component = fixture.componentInstance;

    let filteredItems = component.getNavItemsFilteredByPermissions(testMenuItems);

    expect(filteredItems).toEqual([testMenuItem1, testMenuItem4, testMenuItem5, testMenuItem6])
  }));

});
