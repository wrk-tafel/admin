import { TestBed, waitForAsync } from "@angular/core/testing";
import { ReactiveFormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { RouterTestingModule } from "@angular/router/testing";
import * as moment from "moment";
import { of, throwError } from "rxjs";
import { CustomerApiService } from "../api/customer-api.service";
import { CustomerSearchComponent } from "./customer-search.component";

describe('CustomerSearchComponent', () => {
    let apiService: jasmine.SpyObj<CustomerApiService>;
    let router: jasmine.SpyObj<Router>;

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

    it('search with existing customerId', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        const testCustomerId = 12345;
        apiService.getCustomer.and.returnValue(of());

        component.customerId.setValue(testCustomerId);
        component.search();

        expect(apiService.getCustomer).toHaveBeenCalledWith(testCustomerId);
        expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail', testCustomerId]);
    });

    it('search with wrong customerId', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;
        apiService.getCustomer.and.returnValue(throwError({ status: 404 }));

        const testCustomerId = 12345;

        component.customerId.setValue(testCustomerId);
        component.search();

        expect(router.navigate).toHaveBeenCalledTimes(0);
        expect(component.errorMessage).toBe('Kundennummer ' + testCustomerId + ' nicht gefunden!');
    });

    it('search with firstname and lastname', () => {
        const fixture = TestBed.createComponent(CustomerSearchComponent);
        const component = fixture.componentInstance;

        component.firstname.setValue('firstname');
        component.lastname.setValue('lastname');

        apiService.searchCustomer.and.returnValue(of({
            items: [
                {
                    id: 0,
                    firstname: 'first',
                    lastname: 'last',
                    birthDate: moment().subtract(20, 'years').toDate(),
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
        }));

        component.search();

        const resultItems = component.searchResult.items;
        expect(resultItems.length).toBe(1);
        expect(resultItems[0]).toEqual(
            {
                id: 0,
                lastname: 'last',
                firstname: 'first',
                birthDate: moment().subtract(20, 'years').format('DD.MM.YYYY'),
                address: 'street 1, Stiege stairway1, Top 20 / 1010 city'
            }
        );
    });

});
