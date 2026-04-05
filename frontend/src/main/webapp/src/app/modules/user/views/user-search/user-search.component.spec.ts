import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {EMPTY, of} from 'rxjs';
import {UserSearchComponent} from './user-search.component';
import {CardModule, ColComponent, RowComponent} from '@coreui/angular';
import {By} from '@angular/platform-browser';
import {UserApiService, UserSearchResult} from '../../../../api/user-api.service';
import { ToastrService } from 'ngx-toastr';

describe('UserSearchComponent', () => {
  let apiService: MockedObject<UserApiService>;
  let router: MockedObject<Router>;
  let toastr: MockedObject<ToastrService>;

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

  beforeEach(() => {
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
          useValue: {
            getUserForPersonnelNumber: vi.fn().mockName("UserApiService.getUserForPersonnelNumber"),
            searchUser: vi.fn().mockName("UserApiService.searchUser")
          }
        },
        {
          provide: Router,
          useValue: {
            navigate: vi.fn().mockName("Router.navigate")
          }
        },
        {
          provide: ToastrService,
          useValue: {
            error: vi.fn().mockName("ToastrService.error"),
            info: vi.fn().mockName("ToastrService.info"),
            success: vi.fn().mockName("ToastrService.success"),
            warning: vi.fn().mockName("ToastrService.warning")
          }
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
    router = TestBed.inject(Router) as MockedObject<Router>;
    toastr = TestBed.inject(ToastrService) as MockedObject<ToastrService>;
  });

  it('component can be created', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('search with existing personnelNumber', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;

    const mockUser = searchUserMockResponse.items[0];
    apiService.getUserForPersonnelNumber.mockReturnValue(of(mockUser));

    const testPersonnelNumber = '12345';

    component.searchFormModel.set({
      personnelNumber: testPersonnelNumber,
      firstname: '',
      lastname: '',
      username: '',
      enabled: null
    });
    component.searchForPersonnelNumber();

    expect(router.navigate).toHaveBeenCalledWith(['/benutzer/detail', mockUser.id]);
  });

  it('search with all parameters', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;

    component.searchFormModel.set({
      personnelNumber: 'personnelnumber',
      firstname: 'firstname',
      lastname: 'lastname',
      username: 'username',
      enabled: true
    });

    apiService.searchUser.mockReturnValue(of(searchUserMockResponse));

    component.searchForDetails();

    expect(apiService.searchUser).toHaveBeenCalledWith('username', true, 'lastname', 'firstname', undefined);

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="searchresult-id-0"]')).nativeElement.textContent).toBe('0');
    expect(fixture.debugElement.query(By.css('[testid="searchresult-name-0"]')).nativeElement.textContent).toBe('last first');
    expect(fixture.debugElement.query(By.css('[testid="searchresult-enabled-0"]')).nativeElement.textContent).toBe('Ja');
  });

  it('search with firstname only', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;
    component.searchFormModel.set({
      personnelNumber: null,
      firstname: 'firstname',
      lastname: null,
      username: null,
      enabled: null
    });
    apiService.searchUser.mockReturnValue(EMPTY);

    component.searchForDetails();

    expect(apiService.searchUser).toHaveBeenCalledWith(null, null, null, 'firstname', undefined);
  });

  it('search with firstname no results', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;
    component.searchFormModel.set({
      personnelNumber: null,
      firstname: 'firstname',
      lastname: null,
      username: null,
      enabled: null
    });

    const response: UserSearchResult = {items: [], totalCount: 0, currentPage: 3, totalPages: 0, pageSize: 0};
    apiService.searchUser.mockReturnValue(of(response));

    component.searchForDetails();

    expect(apiService.searchUser).toHaveBeenCalledWith(null, null, null, 'firstname', undefined);
    expect(toastr.info).toHaveBeenCalledWith('Keine Benutzer gefunden!');
  });

  it('navigate to user', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;

    component.navigateToUserDetail(1);

    expect(router.navigate).toHaveBeenCalledWith(['/benutzer/detail', 1]);
  });

  it('edit user', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;

    component.editUser(1);

    expect(router.navigate).toHaveBeenCalledWith(['/benutzer/bearbeiten', 1]);
  });

});
