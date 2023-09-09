import {TestBed, waitForAsync} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {RouterTestingModule} from '@angular/router/testing';
import * as moment from 'moment';
import {EMPTY, of} from 'rxjs';
import {CustomerApiService, CustomerSearchResult} from '../../../../api/customer-api.service';
import {UserSearchComponent} from './user-search.component';
import {CardModule, ColComponent, RowComponent} from '@coreui/angular';
import {ToastService, ToastType} from '../../../../common/views/default-layout/toasts/toast.service';
import {By} from '@angular/platform-browser';

describe('UserSearchComponent', () => {
  let apiService: jasmine.SpyObj<CustomerApiService>;
  let router: jasmine.SpyObj<Router>;
  let toastService: jasmine.SpyObj<ToastService>;

  const searchCustomerMockResponse = {
    items: [
      {
        id: 0,
        firstname: 'first',
        lastname: 'last',
        birthDate: moment('10.05.2000', 'DD.MM.YYYY').toDate(),
        address: {
          street: 'street',
          houseNumber: '1',
          stairway: 'stairway1',
          door: '20',
          postalCode: 1010,
          city: 'city'
        }
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
          provide: CustomerApiService,
          useValue: jasmine.createSpyObj('CustomerApiService', ['getCustomer', 'searchCustomer'])
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

    apiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
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
    apiService.getCustomer.and.returnValue(of(searchCustomerMockResponse.items[0]));

    const testPersonnelNumber = 12345;

    component.personnelNumber.setValue(testPersonnelNumber);
    component.searchForPersonnelNumber();

    expect(router.navigate).toHaveBeenCalledWith(['/benutzer/detail', testPersonnelNumber]);
  });

  it('search with firstname and lastname', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;

    component.firstname.setValue('firstname');
    component.lastname.setValue('lastname');

    apiService.searchCustomer.and.returnValue(of(searchCustomerMockResponse));

    component.searchForDetails();

    expect(apiService.searchCustomer).toHaveBeenCalledWith('lastname', 'firstname');

    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[testid="searchresult-id-0"]')).nativeElement.textContent).toBe('0');
    expect(fixture.debugElement.query(By.css('[testid="searchresult-lastname-0"]')).nativeElement.textContent).toBe('last');
    expect(fixture.debugElement.query(By.css('[testid="searchresult-firstname-0"]')).nativeElement.textContent).toBe('first');
    expect(fixture.debugElement.query(By.css('[testid="searchresult-birthDate-0"]')).nativeElement.textContent).toBe('10.05.2000');
    expect(fixture.debugElement.query(By.css('[testid="searchresult-address-0"]')).nativeElement.textContent)
      .toBe('street 1, Stiege stairway1, Top 20 / 1010 city');
  });

  it('search with firstname only', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;
    component.firstname.setValue('firstname');
    apiService.searchCustomer.and.returnValue(EMPTY);

    component.searchForDetails();

    expect(apiService.searchCustomer).toHaveBeenCalledWith(null, 'firstname');
  });

  it('search with firstname no results', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;
    component.firstname.setValue('firstname');
    const response: CustomerSearchResult = {items: []};
    apiService.searchCustomer.and.returnValue(of(response));

    component.searchForDetails();

    expect(apiService.searchCustomer).toHaveBeenCalledWith(null, 'firstname');
    expect(toastService.showToast).toHaveBeenCalledWith({type: ToastType.INFO, title: 'Keine Benutzer gefunden!'});
  });

  it('search with lastname only', () => {
    const fixture = TestBed.createComponent(UserSearchComponent);
    const component = fixture.componentInstance;
    component.lastname.setValue('lastname');
    apiService.searchCustomer.and.returnValue(EMPTY);

    component.searchForDetails();

    expect(apiService.searchCustomer).toHaveBeenCalledWith('lastname', null);
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
