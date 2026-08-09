import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {ReactiveFormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {EMPTY, of} from 'rxjs';

dayjs.extend(customParseFormat);
import {CustomerApiService, CustomerSearchResult, Gender} from '../../../../api/customer-api.service';
import {CustomerSearchComponent} from './customer-search.component';
import {By} from '@angular/platform-browser';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

describe('CustomerSearchComponent', () => {
    let apiService: MockedObject<CustomerApiService>;
    let router: MockedObject<Router>;
    let toastr: MockedObject<TafelToastrService>;

    const searchCustomerMockResponse = {
        items: [
            {
                id: 0,
                firstname: 'first',
                lastname: 'last',
                birthDate: dayjs('10.05.2000', 'DD.MM.YYYY').toDate(),
                gender: Gender.MALE,
                address: {
                    street: 'street',
                    houseNumber: '1',
                    stairway: 'stairway1',
                    door: '20',
                    postalCode: 1010,
                    city: 'city'
                },
                additionalPersons: [
                    { key: 1, id: 1, firstname: 'child', lastname: 'last', excludeFromHousehold: false, receivesFamilyAllowance: false }
                ],
            }
        ],
        totalCount: 1,
        currentPage: 0,
        totalPages: 1,
        pageSize: 10
    };

    beforeEach((() => {
        TestBed.configureTestingModule({
            imports: [
                ReactiveFormsModule
            ],
            providers: [
                provideNoopAnimations(),
                {
                    provide: CustomerApiService,
                    useValue: {
                        getCustomer: vi.fn().mockName('CustomerApiService.getCustomer'),
                        searchCustomer: vi.fn().mockName('CustomerApiService.searchCustomer')
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

        apiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
        router = TestBed.inject(Router) as MockedObject<Router>;
        toastr = TestBed.inject(TafelToastrService) as MockedObject<TafelToastrService>;

        // The component searches once as it is constructed, before any test can arrange a response -
        // without a default here every test would fail on the constructor rather than on its subject.
        apiService.searchCustomer.mockReturnValue(EMPTY);
    }));

    it('loads the first page of customers without being asked to', () => {
        apiService.searchCustomer.mockReturnValue(of(searchCustomerMockResponse));

        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;

        expect(apiService.searchCustomer)
            .toHaveBeenCalledWith(undefined, undefined, undefined, undefined, undefined, undefined);
        expect(component.searchResult()).toEqual(searchCustomerMockResponse);
    });

    it('stays silent when that initial load finds nothing', () => {
        apiService.searchCustomer.mockReturnValue(of({items: [], totalCount: 0, currentPage: 1, totalPages: 0, pageSize: 10}));

        TestBed.createComponent(CustomerSearchComponent);

        expect(toastr.info).not.toHaveBeenCalled();
    });

    it('component can be created', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });


    it('search with existing customerId', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        apiService.getCustomer.mockReturnValue(of(searchCustomerMockResponse.items[0]));

        const testCustomerId = 12345;

        component.customerId.setValue(testCustomerId);
        component.searchForCustomerId();

        expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail', testCustomerId]);
    });

    it('search with a search input', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;

        component.searchInput.setValue('muster');

        apiService.searchCustomer.mockReturnValue(of(searchCustomerMockResponse));

        component.searchForDetails();

        expect(apiService.searchCustomer)
            .toHaveBeenCalledWith('muster', undefined, undefined, undefined, undefined, undefined);

        fixture.detectChanges();
        expect(fixture.debugElement.query(By.css('[testid="searchresult-id-0"]')).nativeElement.textContent).toBe('0');
        expect(fixture.debugElement.query(By.css('[testid="searchresult-name-0"]')).nativeElement.textContent).toBe('last first');
        expect(fixture.debugElement.query(By.css('[testid="searchresult-birthDate-0"]')).nativeElement.textContent).toBe('10.05.2000');
        expect(fixture.debugElement.query(By.css('[testid="searchresult-address-0"]')).nativeElement.textContent)
            .toBe('street 1, Stiege stairway1, Top 20, 1010 city');
        expect(fixture.debugElement.query(By.css('[testid="searchresult-personsCount-0"]')).nativeElement.textContent).toBe('2');
    });

    it('search with no results', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        component.searchInput.setValue('muster');
        const response: CustomerSearchResult = { items: [], currentPage: 0, totalCount: 0, totalPages: 0, pageSize: 5 };
        apiService.searchCustomer.mockReturnValue(of(response));

        component.searchForDetails();

        expect(apiService.searchCustomer)
            .toHaveBeenCalledWith('muster', undefined, undefined, undefined, undefined, undefined);
        expect(toastr.info).toHaveBeenCalledWith('Keine Kunden gefunden!');
    });

    it('search with postProcessing enabled', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        component.postProcessing.setValue(true);
        apiService.searchCustomer.mockReturnValue(EMPTY);

        component.searchForDetails();

        expect(apiService.searchCustomer).toHaveBeenCalledWith(undefined, true, undefined, undefined, undefined, undefined);
    });

  it('search with costContribution enabled', () => {
    const fixture = TestBed.createComponent(CustomerSearchComponent);
    const component = fixture.componentInstance;
    component.costContribution.setValue(true);
    apiService.searchCustomer.mockReturnValue(EMPTY);

    component.searchForDetails();

    expect(apiService.searchCustomer).toHaveBeenCalledWith(undefined, undefined, true, undefined, undefined, undefined);
  });

  it('search with valid enabled', () => {
    const fixture = TestBed.createComponent(CustomerSearchComponent);
    const component = fixture.componentInstance;
    component.valid.setValue(true);
    apiService.searchCustomer.mockReturnValue(EMPTY);

    component.searchForDetails();

    expect(apiService.searchCustomer).toHaveBeenCalledWith(undefined, undefined, undefined, true, undefined, undefined);
  });

    it('navigate to customer', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;

        component.navigateToCustomer(1);

        expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail', 1]);
    });

    it('edit customer', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;

        component.editCustomer(1);

        expect(router.navigate).toHaveBeenCalledWith(['/kunden/bearbeiten', 1]);
    });

});
