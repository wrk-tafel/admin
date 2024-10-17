import {TestBed, waitForAsync} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {EMPTY, of} from 'rxjs';
import {UserSearchComponent} from './user-search.component';
import {CardModule, ColComponent, RowComponent} from '@coreui/angular';
import {By} from '@angular/platform-browser';
import {UserApiService, UserSearchResult} from '../../../api/user-api.service';
import {ToastService, ToastType} from '../../../common/views/default-layout/toasts/toast.service';

describe('UserSearchComponent', () => {
  let apiService: jasmine.SpyObj<UserApiService>;
  let router: jasmine.SpyObj<Router>;
  let toastService: jasmine.SpyObj<ToastService>;

  const searchUserMockResponse: UserSearchResult = {
    items: [
      {
        id: 0,
        personnelNumber: '0',
        username: '0',
        firstname: 'first',
        lastname: 'last',
        enabled: true,
        passwordChangeRequired: true,
        permissions: []
      }
    ],
    totalCount: 1,
    currentPage: 2,
    totalPages: 1,
    pageSize: 10
  };

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
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('search with existing personnelNumber', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;

    const mockUser = searchUserMockResponse.items[0];
    apiService.getUserForPersonnelNumber.and.returnValue(of(mockUser));

    const testPersonnelNumber = '12345';

    component.personnelNumber.setValue(testPersonnelNumber);
    component.searchForPersonnelNumber();

    expect(router.navigate).toHaveBeenCalledWith(['/benutzer/detail', mockUser.id]);
  });

  it('search with all parameters', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;

    component.username.setValue('username');
    component.enabled.setValue(false);
    component.firstname.setValue('firstname');
    component.lastname.setValue('lastname');

    apiService.searchUser.and.returnValue(of(searchUserMockResponse));

    component.searchForDetails();

    expect(apiService.searchUser).toHaveBeenCalledWith('username', false, 'lastname', 'firstname', undefined);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="searchresult-id-0"]')).nativeElement.textContent).toBe('0');
    expect(fixture.debugElement.query(By.css('[testid="searchresult-lastname-0"]')).nativeElement.textContent).toBe('last');
    expect(fixture.debugElement.query(By.css('[testid="searchresult-firstname-0"]')).nativeElement.textContent).toBe('first');
    expect(fixture.debugElement.query(By.css('[testid="searchresult-enabled-0"]')).nativeElement.textContent).toBe('Ja');
  });

  it('search with firstname only', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;
    component.firstname.setValue('firstname');
    component.enabled.setValue(null);
    apiService.searchUser.and.returnValue(EMPTY);

    component.searchForDetails();

    expect(apiService.searchUser).toHaveBeenCalledWith(null, null, null, 'firstname', undefined);
  });

  it('search with firstname no results', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;
    component.firstname.setValue('firstname');
    component.enabled.setValue(null);
    const response: UserSearchResult = {items: [], totalCount: 0, currentPage: 3, totalPages: 0, pageSize: 0};
    apiService.searchUser.and.returnValue(of(response));

    component.searchForDetails();

    expect(apiService.searchUser).toHaveBeenCalledWith(null, null, null, 'firstname', undefined);
    expect(toastService.showToast).toHaveBeenCalledWith({type: ToastType.INFO, title: 'Keine Benutzer gefunden!'});
  });

  it('navigate to user', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;

    component.navigateToUser(1);

    expect(router.navigate).toHaveBeenCalledWith(['/benutzer/detail', 1]);
  });

  it('edit user', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;

    component.editUser(1);

    expect(router.navigate).toHaveBeenCalledWith(['/benutzer/bearbeiten', 1]);
  });

});
