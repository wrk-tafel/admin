import {ComponentFixture, TestBed, waitForAsync} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {UserDetailComponent} from './user-detail.component';
import {CardModule, ColComponent, RowComponent} from '@coreui/angular';
import {UserApiService, UserData} from '../../../api/user-api.service';
import {By} from '@angular/platform-browser';
import {of, throwError} from 'rxjs';
import {ToastService, ToastType} from '../../../common/views/default-layout/toasts/toast.service';

describe('UserDetailComponent', () => {
  const mockUser: UserData = {
    id: 0,
    personnelNumber: '0000',
    username: 'username',
    firstname: 'first',
    lastname: 'last',
    enabled: true,
    passwordChangeRequired: true,
    permissions: [
      {key: 'PERM1', title: 'Permission 1'},
      {key: 'PERM2', title: 'Permission 2'}
    ]
  };

  let userApiService: jasmine.SpyObj<UserApiService>;
  let router: jasmine.SpyObj<Router>;
  let toastService: jasmine.SpyObj<ToastService>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        CardModule,
        RowComponent,
        ColComponent
      ],
      providers: [
        {
          provide: UserApiService,
          useValue: jasmine.createSpyObj('UserApiService', ['updateUser', 'deleteUser'])
        },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj('ToastService', ['showToast'])
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {
                userData: mockUser
              }
            }
          }
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate'])
        }
      ]
    }).compileComponents();

    userApiService = TestBed.inject(UserApiService) as jasmine.SpyObj<UserApiService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(UserDetailComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('initial data loaded and shown correctly', () => {
    const fixture = TestBed.createComponent(UserDetailComponent);
    const component = fixture.componentInstance;
    component.userData = mockUser;
    fixture.detectChanges();

    expect(getTextByTestId(fixture, 'nameText')).toBe(`${mockUser.firstname} ${mockUser.lastname}`);
    expect(getTextByTestId(fixture, 'usernameText')).toBe(mockUser.username);
    expect(getTextByTestId(fixture, 'personnelNumberText')).toBe(mockUser.personnelNumber);
    expect(getTextByTestId(fixture, 'passwordChangeRequiredText')).toBe('Ja');
    expect(getTextByTestId(fixture, 'enabledText')).toBe('Ja');
  });

  it('enable user', () => {
    const fixture = TestBed.createComponent(UserDetailComponent);
    const component = fixture.componentInstance;
    component.userData = {...mockUser, enabled: false};

    const updatedUserData = mockUser;
    userApiService.updateUser.and.returnValues(of(updatedUserData));

    component.enableUser();

    expect(userApiService.updateUser).toHaveBeenCalledWith({...mockUser, enabled: true});
    expect(component.userData).toEqual(updatedUserData);
  });

  it('disable user', () => {
    const fixture = TestBed.createComponent(UserDetailComponent);
    const component = fixture.componentInstance;
    component.userData = {...mockUser, enabled: true};

    const updatedUserData = mockUser;
    userApiService.updateUser.and.returnValues(of(updatedUserData));

    component.disableUser();

    expect(userApiService.updateUser).toHaveBeenCalledWith({...mockUser, enabled: false});
    expect(component.userData).toEqual(updatedUserData);
  });

  it('deleted user successfully', () => {
    const fixture = TestBed.createComponent(UserDetailComponent);
    const component = fixture.componentInstance;
    component.userData = mockUser;
    userApiService.deleteUser.and.returnValues(of(null));

    component.deleteUser();

    expect(userApiService.deleteUser).toHaveBeenCalledWith(mockUser.id);
    expect(router.navigate).toHaveBeenCalledWith(['/benutzer/suchen']);
    expect(toastService.showToast).toHaveBeenCalledWith({type: ToastType.SUCCESS, title: 'Benutzer wurde gelöscht!'});
  });

  it('delete user failed', () => {
    const fixture = TestBed.createComponent(UserDetailComponent);
    const component = fixture.componentInstance;
    component.userData = mockUser;
    userApiService.deleteUser.and.returnValues(throwError(() => {
      return {status: 404};
    }));

    component.deleteUser();

    expect(userApiService.deleteUser).toHaveBeenCalledWith(mockUser.id);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(toastService.showToast).toHaveBeenCalledWith({type: ToastType.ERROR, title: 'Löschen fehlgeschlagen!'});
  });

  it('editUser should navigate properly', () => {
    const fixture = TestBed.createComponent(UserDetailComponent);
    const component = fixture.componentInstance;
    component.userData = mockUser;

    component.editUser();

    expect(router.navigate).toHaveBeenCalledWith(['/benutzer/bearbeiten', mockUser.id]);
  });

  it('formatted permissions', () => {
    const fixture = TestBed.createComponent(UserDetailComponent);
    const component = fixture.componentInstance;
    component.userData = mockUser;

    const permissions = component.formatPermissions();

    expect(permissions).toEqual(`${mockUser.permissions[0].title}, ${mockUser.permissions[1].title}`);
  });

  function getTextByTestId(fixture: ComponentFixture<UserDetailComponent>, testId: string): string {
    return fixture.debugElement.query(By.css(`[testid="${testId}"]`)).nativeElement.textContent;
  }

});
