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
    id: 133,
    lastname: 'Mustermann',
    firstname: 'Max',
    birthDate: moment().subtract(30, 'years').startOf('day').utc().toDate(),
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
    incomeDue: moment().add(1, 'years').startOf('day').utc().toDate(),

    additionalPersons: [
      { lastname: 'Add', firstname: 'Pers 1', birthDate: moment().subtract(5, 'years').startOf('day').utc().toDate(), income: 50 },
      { lastname: 'Add', firstname: 'Pers 2', birthDate: moment().subtract(10, 'years').startOf('day').utc().toDate(), income: 80 }
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
            params: of({ id: mockCustomer.id })
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
    apiService.getCustomer.withArgs(mockCustomer.id).and.returnValue(of(mockCustomer));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();

    const checkData: CustomerDetailData = {
      id: mockCustomer.id,
      lastname: mockCustomer.lastname,
      firstname: mockCustomer.firstname,
      birthDateAge: moment(mockCustomer.birthDate).startOf('day').utc().format('DD.MM.YYYY') + ' (30)',
      country: mockCustomer.country.name,
      telephoneNumber: mockCustomer.telephoneNumber,
      email: mockCustomer.email,
      addressLine: mockCustomer.address.street
        + ' '
        + mockCustomer.address.houseNumber
        + ', Stiege '
        + mockCustomer.address.stairway
        + ', Top '
        + mockCustomer.address.door,
      addressPostalCode: mockCustomer.address.postalCode,
      addressCity: mockCustomer.address.city,
      employer: mockCustomer.employer,
      income: mockCustomer.income,
      incomeDue: moment(mockCustomer.incomeDue).startOf('day').utc().format('DD.MM.YYYY')
    };
    expect(component.customerDetailData).toEqual(checkData);

    const addPers1 = mockCustomer.additionalPersons[0];
    const addPers2 = mockCustomer.additionalPersons[1];
    expect(component.additionalPersonsDetailData).toEqual(
      [
        {
          lastname: addPers1.lastname,
          firstname: addPers1.firstname,
          birthDateAge: moment(addPers1.birthDate).startOf('day').utc().format('DD.MM.YYYY') + ' (5)',
          income: addPers1.income
        },
        {
          lastname: addPers2.lastname,
          firstname: addPers2.firstname,
          birthDateAge: moment(addPers2.birthDate).startOf('day').utc().format('DD.MM.YYYY') + ' (10)',
          income: addPers2.income
        }
      ]
    );
  }));

});
