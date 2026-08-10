import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {EMPTY, of} from 'rxjs';
import {UserSearchComponent} from './user-search.component';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatTableModule} from '@angular/material/table';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import {UserApiService, UserSearchResult} from '../../../../api/user-api.service';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('UserSearchComponent', () => {
  let apiService: MockedObject<UserApiService>;
  let router: MockedObject<Router>;
  let toastr: MockedObject<TafelToastrService>;

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
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        NoopAnimationsModule,
        ReactiveFormsModule,
        // CommonModule required for *ngIf, *ngFor etc.
        CommonModule
      ],
      providers: [
        {
          provide: UserApiService,
          useValue: {
            getUserForPersonnelNumber: vi.fn().mockName('UserApiService.getUserForPersonnelNumber'),
            searchUser: vi.fn().mockName('UserApiService.searchUser')
          }
        },
        {
          provide: Router,
          useValue: {
            navigate: vi.fn().mockName('Router.navigate')
          }
        },
        {
          provide: TafelToastrService,
          useValue: {
            error: vi.fn().mockName('TafelToastrService.error'),
            info: vi.fn().mockName('TafelToastrService.info'),
            success: vi.fn().mockName('TafelToastrService.success'),
            warning: vi.fn().mockName('TafelToastrService.warning')
          }
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(UserApiService) as MockedObject<UserApiService>;
    router = TestBed.inject(Router) as MockedObject<Router>;
    toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;

    // The component searches once as it is constructed, before any test can arrange a response -
    // without a default here every test would fail on the constructor rather than on its subject.
    apiService.searchUser.mockReturnValue(EMPTY);
  });

  it('loads the first page of active users without being asked to', () => {
    apiService.searchUser.mockReturnValue(of(searchUserMockResponse));

    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;

    expect(apiService.searchUser).toHaveBeenCalledWith('', true, undefined, undefined);
    expect(component.searchResult()).toEqual(searchUserMockResponse);
  });

  it('stays silent when that initial load finds nothing', () => {
    apiService.searchUser.mockReturnValue(of({items: [], totalCount: 0, currentPage: 1, totalPages: 0, pageSize: 10}));

    TestBed.createComponent(UserSearchComponent);

    expect(toastr.info).not.toHaveBeenCalled();
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
      searchInput: '',
      enabled: false
    });
    component.searchForPersonnelNumber();

    expect(router.navigate).toHaveBeenCalledWith(['/benutzer/detail', mockUser.id]);
  });

  it('search with all parameters', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;

    component.searchFormModel.set({
      personnelNumber: 'personnelnumber',
      searchInput: 'muster',
      enabled: true
    });

    apiService.searchUser.mockReturnValue(of(searchUserMockResponse));

    component.searchForDetails();

    expect(apiService.searchUser).toHaveBeenCalledWith('muster', true, undefined, undefined);

    fixture.detectChanges();
    // mat-table renders rows; query by attribute selector on nativeElement
    const root = fixture.nativeElement as HTMLElement;
    const idEl = root.querySelector('[testid="searchresult-id-0"]');
    const nameEl = root.querySelector('[testid="searchresult-name-0"]');
    const enabledEl = root.querySelector('[testid="searchresult-enabled-0"]');

    expect(idEl?.textContent?.trim()).toBe('0');
    expect(nameEl?.textContent?.trim()).toBe('last first');
    expect(enabledEl?.textContent?.trim()).toBe('Ja');
  });

  it('search with the filter only', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;
    component.searchFormModel.set({
      personnelNumber: '',
      searchInput: '',
      enabled: false
    });
    apiService.searchUser.mockReturnValue(EMPTY);

    component.searchForDetails();

    expect(apiService.searchUser).toHaveBeenCalledWith('', false, undefined, undefined);
  });

  it('search with no results', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;
    component.searchFormModel.set({
      personnelNumber: '',
      searchInput: 'muster',
      enabled: false
    });

    const response: UserSearchResult = {items: [], totalCount: 0, currentPage: 3, totalPages: 0, pageSize: 0};
    apiService.searchUser.mockReturnValue(of(response));

    component.searchForDetails();

    expect(apiService.searchUser).toHaveBeenCalledWith('muster', false, undefined, undefined);
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
