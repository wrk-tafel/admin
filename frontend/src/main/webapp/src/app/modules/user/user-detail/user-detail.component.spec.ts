import {ComponentFixture, TestBed, waitForAsync} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import {UserDetailComponent} from './user-detail.component';
import {CardModule, ColComponent, RowComponent} from '@coreui/angular';
import {UserApiService, UserData} from '../../../api/user-api.service';
import {By} from '@angular/platform-browser';

describe('UserDetailComponent', () => {
  const mockUser: UserData = {
    id: 0,
    personnelNumber: '0000',
    username: 'username',
    firstname: 'first',
    lastname: 'last',
    enabled: true,
    passwordChangeRequired: true
  };

  let router: jasmine.SpyObj<Router>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        ReactiveFormsModule,
        CardModule,
        RowComponent,
        ColComponent
      ],
      declarations: [
        UserDetailComponent,
      ],
      providers: [
        {
          provide: UserApiService,
          useValue: jasmine.createSpyObj('UserApiService', ['getUserForPersonnelNumber', 'searchUser'])
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

    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(UserDetailComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('initial data loaded and shown correctly', () => {
    const fixture = TestBed.createComponent(UserDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.userData).toEqual(mockUser);

    expect(getTextByTestId(fixture, 'nameText')).toBe(`${mockUser.firstname} ${mockUser.lastname}`);
    expect(getTextByTestId(fixture, 'usernameText')).toBe(mockUser.username);
    expect(getTextByTestId(fixture, 'personnelNumberText')).toBe(mockUser.personnelNumber);
    expect(getTextByTestId(fixture, 'passwordChangeRequiredText')).toBe('Ja');
    expect(getTextByTestId(fixture, 'enabledText')).toBe('Ja');
  });

  it('editUser should navigate properly', () => {
    const fixture = TestBed.createComponent(UserDetailComponent);
    const component = fixture.componentInstance;
    component.userData = mockUser

    component.editUser();

    expect(router.navigate).toHaveBeenCalledWith(['/benutzer/bearbeiten', mockUser.id]);
  });

  function getTextByTestId(fixture: ComponentFixture<UserDetailComponent>, testId: string): string {
    return fixture.debugElement.query(By.css(`[testid="${testId}"]`)).nativeElement.textContent;
  }

});
