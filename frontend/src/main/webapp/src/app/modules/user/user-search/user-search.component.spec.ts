import {TestBed, waitForAsync} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
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
        UserSearchComponent,
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
    apiService.getUserForPersonnelNumber.and.returnValue(of(searchUserMockResponse.items[0]));

    const testPersonnelNumber = '12345';

    component.personnelNumber.setValue(testPersonnelNumber);
    component.searchForPersonnelNumber();

    expect(router.navigate).toHaveBeenCalledWith(['/benutzer/detail', testPersonnelNumber]);
  });

  it('search with firstname and lastname', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;

    component.firstname.setValue('firstname');
    component.lastname.setValue('lastname');

    apiService.searchUser.and.returnValue(of(searchUserMockResponse));

    component.searchForDetails();

    expect(apiService.searchUser).toHaveBeenCalledWith('lastname', 'firstname');

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="searchresult-id-0"]')).nativeElement.textContent).toBe('0');
    expect(fixture.debugElement.query(By.css('[testid="searchresult-lastname-0"]')).nativeElement.textContent).toBe('last');
    expect(fixture.debugElement.query(By.css('[testid="searchresult-firstname-0"]')).nativeElement.textContent).toBe('first');
  });

  it('search with firstname only', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;
    component.firstname.setValue('firstname');
    apiService.searchUser.and.returnValue(EMPTY);

    component.searchForDetails();

    expect(apiService.searchUser).toHaveBeenCalledWith(null, 'firstname');
  });

  it('search with firstname no results', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;
    component.firstname.setValue('firstname');
    const response: UserSearchResult = {items: []};
    apiService.searchUser.and.returnValue(of(response));

    component.searchForDetails();

    expect(apiService.searchUser).toHaveBeenCalledWith(null, 'firstname');
    expect(toastService.showToast).toHaveBeenCalledWith({type: ToastType.INFO, title: 'Keine Benutzer gefunden!'});
  });

  it('search with lastname only', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;
    component.lastname.setValue('lastname');
    apiService.searchUser.and.returnValue(EMPTY);

    component.searchForDetails();

    expect(apiService.searchUser).toHaveBeenCalledWith('lastname', null);
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
