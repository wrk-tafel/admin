import {HttpClientTestingModule} from '@angular/common/http/testing';
import {TestBed, waitForAsync} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import {of} from 'rxjs';
import {UserEditComponent} from './user-edit.component';
import {
  BgColorDirective,
  CardModule,
  ColComponent,
  InputGroupComponent,
  ModalModule,
  RowComponent
} from '@coreui/angular';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {UserApiService, UserData} from '../../../api/user-api.service';
import {UserFormComponent} from '../user-form/user-form.component';

describe('UserEditComponent - Creating a new user', () => {
  const mockUser: UserData = {
    id: 0,
    personnelNumber: '0000',
    username: 'username',
    firstname: 'first',
    lastname: 'last',
    enabled: true,
    passwordChangeRequired: true,
    permissions: []
  };

  let apiService: jasmine.SpyObj<UserApiService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        HttpClientTestingModule,
        RouterTestingModule,
        ReactiveFormsModule,
        ModalModule,
        InputGroupComponent,
        CardModule,
        RowComponent,
        ColComponent,
        BgColorDirective
      ],
      providers: [
        {
          provide: UserApiService,
          useValue: jasmine.createSpyObj('UserApiService', ['createUser', 'updateUser'])
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {}
            }
          }
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate'])
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(UserApiService) as jasmine.SpyObj<UserApiService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  }));

  it('new user saved successfully', () => {
    const userFormComponent = jasmine.createSpyObj('UserFormComponent', ['markAllAsTouched', 'isValid']);
    userFormComponent.isValid.and.returnValue(true);
    apiService.createUser.and.returnValue(of(mockUser));

    const fixture = TestBed.createComponent(UserEditComponent);
    const component = fixture.componentInstance;
    component.userFormComponent = userFormComponent;
    component.userUpdated = mockUser;

    component.save();

    expect(component.isSaveEnabled()).toBeTrue();
    expect(userFormComponent.markAllAsTouched).toHaveBeenCalled();
    expect(apiService.createUser).toHaveBeenCalledWith(jasmine.objectContaining(mockUser));
    expect(router.navigate).toHaveBeenCalledWith(['/benutzer/detail', mockUser.id]);
  });

});
