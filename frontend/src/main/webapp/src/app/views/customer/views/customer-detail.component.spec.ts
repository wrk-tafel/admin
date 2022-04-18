import { TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import * as moment from 'moment';
import { of } from 'rxjs';
import { CustomerApiService, CustomerData } from '../api/customer-api.service';
import { CustomerDetailComponent, CustomerDetailData } from './customer-detail.component';

describe('CustomerDetailComponent', () => {
  let apiService: jasmine.SpyObj<CustomerApiService>;

  const mockCustomer: CustomerData = {
    id: 0,
    customerId: 1,
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: moment().subtract(30, 'years').startOf('day').toDate(),
    country: {
      id: 0,
      code: 'AT',
      name: 'Österreich'
    },
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
    incomeDue: new Date(),

    additionalPersons: [
      { lastname: 'Add', firstname: 'Pers 1', birthDate: moment().subtract(5, 'years').startOf('day').toDate(), income: 50 },
      { lastname: 'Add', firstname: 'Pers 2', birthDate: moment().subtract(10, 'years').startOf('day').toDate(), income: 80 }
    ]
  };

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
    apiService.getCustomer.withArgs(333).and.returnValue(of(mockCustomer));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();

    const checkData: CustomerDetailData = {
      id: 0,
      customerId: 1,
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDateAge: moment(mockCustomer.birthDate).format('DD.MM.YYYY') + ' (30)',
      country: 'Österreich',
      telephoneNumber: 6644123123123,
      email: 'max.mustermann@gmail.com',
      addressLine: 'Teststraße 123A, Stiege 1, Top 21',
      addressPostalCode: 1020,
      addressCity: 'Wien',
      employer: 'test employer',
      income: 1000,
      incomeDue: moment(mockCustomer.incomeDue).format('DD.MM.YYYY')
    };
    expect(component.customerDetailData).toEqual(checkData);

    expect(component.additionalPersonsDetailData).toEqual(
      [
        {
          lastname: 'Add',
          firstname: 'Pers 1',
          birthDateAge: moment(mockCustomer.additionalPersons[0].birthDate).format('DD.MM.YYYY') + ' (5)',
          income: 50
        },
        {
          lastname: 'Add',
          firstname: 'Pers 2',
          birthDateAge: moment(mockCustomer.additionalPersons[1].birthDate).format('DD.MM.YYYY') + ' (10)',
          income: 80
        }
      ]
    );
  }));

});
