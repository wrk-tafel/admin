import { TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import * as moment from 'moment';
import { of, throwError } from 'rxjs';
import { CustomerApiService } from '../api/customer-api.service';
import { CustomerSearchComponent } from './customer-search.component';

describe('CustomerSearchComponent', () => {
    let apiService: jasmine.SpyObj<CustomerApiService>;
    let router: jasmine.SpyObj<Router>;

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
                ReactiveFormsModule
            ],
            declarations: [
                CustomerSearchComponent,
            ],
            providers: [
                {
                    provide: CustomerApiService,
                    useValue: jasmine.createSpyObj('CustomerApiService', ['getCustomer', 'searchCustomer'])
                },
                {
                    provide: Router,
                    useValue: jasmine.createSpyObj('Router', ['navigate'])
                }
            ]
        }).compileComponents();

        apiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
        router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    }));

    it('component can be created', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        expect(component).toBeTruthy();
    });

    /*
    // TODO finish test
    it('search with existing customerId', fakeAsync(() => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        const testCustomerId = 12345;
        apiService.getCustomer.and.returnValue(of());

        component.customerId.setValue(testCustomerId);
        component.search();

        tick(1000);

        expect(apiService.getCustomer).toHaveBeenCalledWith(testCustomerId);
        expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail', testCustomerId]);
    }));
    */

    it('search with wrong customerId', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        apiService.getCustomer.and.returnValue(throwError({ status: 404 }));

        const testCustomerId = 12345;

        component.customerId.setValue(testCustomerId);
        component.searchForCustomerId();

        expect(router.navigate).toHaveBeenCalledTimes(0);
        expect(component.errorMessage).toBe('Kundennummer ' + testCustomerId + ' nicht gefunden!');
    });

    it('search with firstname and lastname', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;

        component.firstname.setValue('firstname');
        component.lastname.setValue('lastname');

        apiService.searchCustomer.and.returnValue(of(searchCustomerMockResponse));

        component.searchForDetails();

        expect(apiService.searchCustomer).toHaveBeenCalledWith('lastname', 'firstname');

        fixture.detectChanges();
        expect(fixture.debugElement.query(By.css('[testId="searchresult-id-0"]')).nativeElement.textContent).toBe('0');
        expect(fixture.debugElement.query(By.css('[testId="searchresult-lastname-0"]')).nativeElement.textContent).toBe('last');
        expect(fixture.debugElement.query(By.css('[testId="searchresult-firstname-0"]')).nativeElement.textContent).toBe('first');
        expect(fixture.debugElement.query(By.css('[testId="searchresult-birthDate-0"]')).nativeElement.textContent).toBe('10.05.2000');
        expect(fixture.debugElement.query(By.css('[testId="searchresult-address-0"]')).nativeElement.textContent)
            .toBe('street 1, Stiege stairway1, Top 20 / 1010 city');
    });

    it('search with firstname only', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        component.firstname.setValue('firstname');
        apiService.searchCustomer.and.returnValue(of());

        component.searchForDetails();

        expect(apiService.searchCustomer).toHaveBeenCalledWith('', 'firstname');
    });

    it('search with lastname only', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        component.lastname.setValue('lastname');
        apiService.searchCustomer.and.returnValue(of());

        component.searchForDetails();

        expect(apiService.searchCustomer).toHaveBeenCalledWith('lastname', '');
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
