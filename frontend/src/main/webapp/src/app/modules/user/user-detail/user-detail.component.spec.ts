import {TestBed, waitForAsync} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import {UserDetailComponent} from './user-detail.component';
import {CardModule, ColComponent, RowComponent} from '@coreui/angular';
import {UserApiService} from '../../../api/user-api.service';
import {ToastService} from '../../../common/views/default-layout/toasts/toast.service';

describe('UserDetailComponent', () => {
  let apiService: jasmine.SpyObj<UserApiService>;
  let router: jasmine.SpyObj<Router>;
  let toastService: jasmine.SpyObj<ToastService>;

  const searchUserMockResponse = {
    items: [
      {
        id: 0,
        personnelNumber: '0',
        username: '0',
        firstname: 'first',
        lastname: 'last'
      }
    ]
  };

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
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate'])
        },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj('ToastService', ['showToast'])
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(UserApiService) as jasmine.SpyObj<UserApiService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(UserDetailComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

});
