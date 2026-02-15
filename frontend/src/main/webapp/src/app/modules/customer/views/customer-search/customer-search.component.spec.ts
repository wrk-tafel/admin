import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import moment from 'moment';
import { EMPTY, of } from 'rxjs';
import { CustomerApiService, CustomerSearchResult, Gender } from '../../../../api/customer-api.service';
import { CustomerSearchComponent } from './customer-search.component';
import { CardModule, ColComponent, PaginationModule, RowComponent } from '@coreui/angular';
import { ToastService, ToastType } from '../../../../common/components/toasts/toast.service';
import { By } from '@angular/platform-browser';

describe('CustomerSearchComponent', () => {
    let apiService: MockedObject<CustomerApiService>;
    let router: MockedObject<Router>;
    let toastService: MockedObject<ToastService>;

    const searchCustomerMockResponse = {
        items: [
            {
                id: 0,
                firstname: 'first',
                lastname: 'last',
                birthDate: moment('10.05.2000', 'DD.MM.YYYY').toDate(),
                gender: Gender.MALE,
                address: {
                    street: 'street',
                    houseNumber: '1',
                    stairway: 'stairway1',
                    door: '20',
                    postalCode: 1010,
                    city: 'city'
                },
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
                ReactiveFormsModule,
                CardModule,
                RowComponent,
                ColComponent,
                PaginationModule
            ],
            providers: [
                {
                    provide: CustomerApiService,
                    useValue: {
                        getCustomer: vi.fn().mockName("CustomerApiService.getCustomer"),
                        searchCustomer: vi.fn().mockName("CustomerApiService.searchCustomer")
                    }
                },
                {
                    provide: Router,
                    useValue: {
                        navigate: vi.fn().mockName("Router.navigate")
                    }
                },
                {
                    provide: ToastService,
                    useValue: {
                        showToast: vi.fn().mockName("ToastService.showToast")
                    }
                }
            ]
        }).compileComponents();

        apiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
        router = TestBed.inject(Router) as MockedObject<Router>;
        toastService = TestBed.inject(ToastService) as MockedObject<ToastService>;
    }));

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

    it('search with firstname and lastname', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;

        component.firstname.setValue('firstname');
        component.lastname.setValue('lastname');

        apiService.searchCustomer.mockReturnValue(of(searchCustomerMockResponse));

        component.searchForDetails();

        expect(apiService.searchCustomer).toHaveBeenCalledWith('lastname', 'firstname', null, null, undefined);

        fixture.detectChanges();
        expect(fixture.debugElement.query(By.css('[testid="searchresult-id-0"]')).nativeElement.textContent).toBe('0');
        expect(fixture.debugElement.query(By.css('[testid="searchresult-name-0"]')).nativeElement.textContent).toBe('last first');
        expect(fixture.debugElement.query(By.css('[testid="searchresult-birthDate-0"]')).nativeElement.textContent).toBe('10.05.2000');
        expect(fixture.debugElement.query(By.css('[testid="searchresult-address-0"]')).nativeElement.textContent)
            .toBe('street 1, Stiege stairway1, Top 20, 1010 city');
    });

    it('search with firstname only', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        component.firstname.setValue('firstname');
        apiService.searchCustomer.mockReturnValue(EMPTY);

        component.searchForDetails();

        expect(apiService.searchCustomer).toHaveBeenCalledWith(null, 'firstname', null, null, undefined);
    });

    it('search with firstname no results', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        component.firstname.setValue('firstname');
        const response: CustomerSearchResult = { items: [], currentPage: 0, totalCount: 0, totalPages: 0, pageSize: 5 };
        apiService.searchCustomer.mockReturnValue(of(response));

        component.searchForDetails();

        expect(apiService.searchCustomer).toHaveBeenCalledWith(null, 'firstname', null, null, undefined);
        expect(toastService.showToast).toHaveBeenCalledWith({ type: ToastType.INFO, title: 'Keine Kunden gefunden!' });
    });

    it('search with lastname only', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        component.lastname.setValue('lastname');
        apiService.searchCustomer.mockReturnValue(EMPTY);

        component.searchForDetails();

        expect(apiService.searchCustomer).toHaveBeenCalledWith('lastname', null, null, null, undefined);
    });

    it('search with postProcessing enabled', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        component.postProcessing.setValue(true);
        apiService.searchCustomer.mockReturnValue(EMPTY);

        component.searchForDetails();

        expect(apiService.searchCustomer).toHaveBeenCalledWith(null, null, true, null, undefined);
    });

    it('search with costContribution enabled', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        component.costContribution.setValue(true);
        apiService.searchCustomer.mockReturnValue(EMPTY);

        component.searchForDetails();

        expect(apiService.searchCustomer).toHaveBeenCalledWith(null, null, null, true, undefined);
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
