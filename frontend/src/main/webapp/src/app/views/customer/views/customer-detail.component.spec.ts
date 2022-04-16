import { TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Observable, of } from 'rxjs';
import { CustomerApiService, CustomerData } from '../api/customer-api.service';
import { CustomerDetailComponent } from './customer-detail.component';

describe('CustomerDetailComponent', () => {
  let apiService: jasmine.SpyObj<CustomerApiService>;

  beforeEach(waitForAsync(() => {
    const apiServiceSpy = jasmine.createSpyObj('CustomerApiService', ['getCustomer']);

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        {
          provide: CustomerApiService,
          useValue: apiServiceSpy
        },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: 333 })
          }
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
  }));

  it('component can be created', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('initial data loaded', waitForAsync(() => {
    const incomeDueDate = new Date();
    const mockCustomer: CustomerData = {
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: new Date(1980, 4, 10, 0, 0, 0),
      country: 'AT',
      telephoneNumber: 6644123123123,
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
      incomeDue: incomeDueDate,

      additionalPersons: [
        { lastname: 'Add', firstname: 'Pers 1', birthDate: new Date(1990, 3, 10, 0, 0, 0), income: 50 },
        { lastname: 'Add', firstname: 'Pers 2', birthDate: new Date(2000, 2, 11, 0, 0, 0), income: 80 }
      ]
    }
    apiService.getCustomer.withArgs(333).and.returnValue(of(mockCustomer));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();

    const checkData: CustomerData = {
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: new Date(1980, 4, 10, 0, 0, 0),
      country: 'AT',
      telephoneNumber: 6644123123123,
      email: 'max.mustermann@gmail.com',

      address: {
        street: 'Teststraße',
        houseNumber: '123A',
        stairway: '1',
        door: '21',
        postalCode: 1020,
        city: 'Wien'
      },

      employer: 'test employer',
      income: 1000,
      incomeDue: incomeDueDate,

      additionalPersons: [
        { lastname: 'Add', firstname: 'Pers 1', birthDate: new Date(1990, 3, 10, 0, 0, 0), income: 50 },
        { lastname: 'Add', firstname: 'Pers 2', birthDate: new Date(2000, 2, 11, 0, 0, 0), income: 80 }
      ]
    };
    expect(component.customerData).toEqual(checkData);
  }));

});
