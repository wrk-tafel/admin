import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
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
import {UserApiService, UserData} from '../../../../api/user-api.service';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideZonelessChangeDetection} from "@angular/core";

describe('UserEditComponent - Editing an existing user', () => {
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

  let router: jasmine.SpyObj<Router>;
  let apiService: jasmine.SpyObj<UserApiService>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        ModalModule,
        CardModule,
        InputGroupComponent,
        RowComponent,
        ColComponent,
        BgColorDirective
      ],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: UserApiService,
          useValue: jasmine.createSpyObj('UserApiService', ['updateUser'])
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate'])
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
        }
      ]
    }).compileComponents();

    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    apiService = TestBed.inject(UserApiService) as jasmine.SpyObj<UserApiService>;
  });

  it('existing user saved successfully', () => {
    const userFormComponent = jasmine.createSpyObj('UserFormComponent', ['markAllAsTouched', 'isValid']);
    userFormComponent.isValid.and.returnValue(true);
    apiService.updateUser.withArgs(mockUser).and.returnValue(of(mockUser));

    const fixture = TestBed.createComponent(UserEditComponent);
    const component = fixture.componentInstance;
    component.userFormComponent = userFormComponent;
    component.userData = mockUser;

    component.ngOnInit();
    component.save();

    expect(component.isSaveEnabled()).toBeTrue();
    expect(component.userData).toEqual(mockUser);
    expect(userFormComponent.markAllAsTouched).toHaveBeenCalled();
    expect(apiService.updateUser).toHaveBeenCalledWith(jasmine.objectContaining(mockUser));
    expect(router.navigate).toHaveBeenCalledWith(['/benutzer/detail', mockUser.id]);
  });

});
