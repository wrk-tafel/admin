import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import moment from 'moment';
import { of } from 'rxjs';
import { CustomerApiService, CustomerData, Gender } from '../../../../api/customer-api.service';
import { CustomerEditComponent } from './customer-edit.component';
import { BgColorDirective, CardModule, ColComponent, InputGroupComponent, ModalModule, RowComponent } from '@coreui/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CustomerEditComponent - Editing an existing customer', () => {
    const testCountry = {
        id: 0,
        code: 'AT',
        name: 'Österreich'
    };
    const testCountry2 = {
        id: 1,
        code: 'DE',
        name: 'Deutschland'
    };
    const testCustomerData: CustomerData = {
        id: 123,
        lastname: 'Mustermann',
        firstname: 'Max',
        birthDate: moment().subtract(40, 'years').startOf('day').utc().toDate(),
        gender: Gender.MALE,
        country: testCountry,
        telephoneNumber: '00436641231231',
        email: 'max.mustermann@gmail.com',
        address: {
            street: 'Teststraße',
            houseNumber: '123A',
            stairway: '1',
            door: '21',
            postalCode: 1020,
            city: 'Wien',
        },
        employer: 'test employer',
        income: 1000,
        incomeDue: moment().add(1, 'years').startOf('day').utc().toDate(),
        validUntil: moment().add(1, 'years').startOf('day').utc().toDate(),
        additionalPersons: [
            {
                key: 0,
                id: 0,
                lastname: 'Add',
                firstname: 'Pers 1',
                birthDate: moment().subtract(5, 'years').startOf('day').utc().toDate(),
                gender: Gender.FEMALE,
                country: testCountry,
                income: 50,
                incomeDue: moment().add(1, 'years').startOf('day').utc().toDate(),
                excludeFromHousehold: false,
                receivesFamilyBonus: true
            },
            {
                key: 1,
                id: 1,
                lastname: 'Add',
                firstname: 'Pers 2',
                birthDate: moment().subtract(2, 'years').startOf('day').utc().toDate(),
                gender: Gender.MALE,
                country: testCountry2,
                excludeFromHousehold: true,
                receivesFamilyBonus: false
            }
        ]
    };

    let router: MockedObject<Router>;
    let apiService: MockedObject<CustomerApiService>;

    beforeEach((() => {
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
                provideNoopAnimations(),
                provideHttpClient(),
                provideHttpClientTesting(),
                {
                    provide: CustomerApiService,
                    useValue: {
                        validate: vi.fn().mockName("CustomerApiService.validate"),
                        getCustomer: vi.fn().mockName("CustomerApiService.getCustomer"),
                        createCustomer: vi.fn().mockName("CustomerApiService.createCustomer"),
                        updateCustomer: vi.fn().mockName("CustomerApiService.updateCustomer")
                    }
                },
                {
                    provide: Router,
                    useValue: {
                        navigate: vi.fn().mockName("Router.navigate")
                    }
                },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            data: {
                                customerData: testCustomerData
                            }
                        }
                    }
                }
            ]
        }).compileComponents();

        router = TestBed.inject(Router) as MockedObject<Router>;
        apiService = TestBed.inject(CustomerApiService) as MockedObject<CustomerApiService>;
    }));

    it('initial checks', () => {
        const fixture = TestBed.createComponent(CustomerEditComponent);
        const component = fixture.componentInstance;
        fixture.componentRef.setInput('customerData', testCustomerData);
        fixture.detectChanges();

        expect(component.editMode).toBe(true);
        expect(component.customerValidForSave).toBe(false);
    });

    it('existing customer saved successfully', () => {
        const customerFormComponent = {
            markAllAsTouched: vi.fn().mockName("CustomerFormComponent.markAllAsTouched"),
            isValid: vi.fn().mockName("CustomerFormComponent.isValid")
        } as any;
        customerFormComponent.isValid.mockReturnValue(true);
        apiService.getCustomer.mockImplementation((id) =>
            id === testCustomerData.id ? of(testCustomerData) : of(testCustomerData)
        );
        apiService.updateCustomer.mockReturnValue(of(testCustomerData));

        const fixture = TestBed.createComponent(CustomerEditComponent);
        const component = fixture.componentInstance;
        fixture.componentRef.setInput('customerData', testCustomerData);
        fixture.detectChanges();
        component.customerFormComponent = customerFormComponent;
        component.customerValidForSave = true;

        component.save();

        expect(component.isSaveEnabled).toBe(true);
        expect(component.editMode).toBe(true);
        expect(component.customerData()).toEqual(testCustomerData);
        expect(customerFormComponent.markAllAsTouched).toHaveBeenCalled();
        expect(apiService.updateCustomer).toHaveBeenCalledWith(expect.objectContaining({
            id: testCustomerData.id,
            lastname: testCustomerData.lastname,
            firstname: testCustomerData.firstname,
            birthDate: testCustomerData.birthDate,
            gender: testCustomerData.gender
        }));
        expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail', testCustomerData.id]);
    });

    it('existing customer saved successfully even when not entitled', () => {
        const customerFormComponent = {
            markAllAsTouched: vi.fn().mockName("CustomerFormComponent.markAllAsTouched"),
            isValid: vi.fn().mockName("CustomerFormComponent.isValid")
        } as any;
        customerFormComponent.isValid.mockReturnValue(true);
        apiService.getCustomer.mockImplementation((id) =>
            id === testCustomerData.id ? of(testCustomerData) : of(testCustomerData)
        );
        apiService.updateCustomer.mockReturnValue(of(testCustomerData));

        const fixture = TestBed.createComponent(CustomerEditComponent);
        const component = fixture.componentInstance;
        fixture.componentRef.setInput('customerData', testCustomerData);
        fixture.detectChanges();
        component.customerFormComponent = customerFormComponent;
        component.customerValidForSave = false;

        component.save();
        fixture.detectChanges();

        expect(component.isSaveEnabled).toBe(true);
        expect(component.editMode).toBe(true);
        expect(component.customerData()).toEqual(testCustomerData);
        expect(customerFormComponent.markAllAsTouched).toHaveBeenCalled();
        expect(apiService.updateCustomer).toHaveBeenCalledWith(expect.objectContaining({
            id: testCustomerData.id,
            lastname: testCustomerData.lastname,
            firstname: testCustomerData.firstname,
            birthDate: testCustomerData.birthDate,
            gender: testCustomerData.gender
        }));
        expect(router.navigate).toHaveBeenCalledWith(['/kunden/detail', testCustomerData.id]);
    });

    it('existing customer save failed when form is invalid', () => {
        const customerFormComponent = {
            markAllAsTouched: vi.fn().mockName("CustomerFormComponent.markAllAsTouched"),
            isValid: vi.fn().mockName("CustomerFormComponent.isValid")
        } as any;
        customerFormComponent.isValid.mockReturnValue(false);
        apiService.updateCustomer.mockReturnValue(of(testCustomerData));

        const fixture = TestBed.createComponent(CustomerEditComponent);
        const component = fixture.componentInstance;
        fixture.componentRef.setInput('customerData', testCustomerData);
        fixture.detectChanges();
        component.customerFormComponent = customerFormComponent;

        component.save();

        expect(component.isSaveEnabled).toBe(false);
        expect(component.editMode).toBe(true);
        expect(component.customerData()).toEqual(testCustomerData);
        expect(customerFormComponent.markAllAsTouched).toHaveBeenCalled();
        expect(apiService.updateCustomer).not.toHaveBeenCalled();
        expect(router.navigate).not.toHaveBeenCalledWith(['/kunden/detail', testCustomerData.id]);
    });

});
