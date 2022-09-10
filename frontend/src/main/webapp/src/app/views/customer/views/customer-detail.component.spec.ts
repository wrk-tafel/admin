import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import * as moment from 'moment';
import { of } from 'rxjs';
import { FileHelperService } from '../../../common/util/file-helper.service';
import { CustomerApiService, CustomerData } from '../api/customer-api.service';
import { CustomerDetailComponent } from './customer-detail.component';

describe('CustomerDetailComponent', () => {
  let apiService: jasmine.SpyObj<CustomerApiService>;
  let fileHelperService: jasmine.SpyObj<FileHelperService>;
  let router: jasmine.SpyObj<Router>;

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
    const apiServiceSpy = jasmine.createSpyObj('CustomerApiService', ['getCustomer', 'generateMasterdataPdf']);
    const fileHelperServiceSpy = jasmine.createSpyObj('FileHelperService', ['downloadFile']);

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        {
          provide: CustomerApiService,
          useValue: apiServiceSpy
        },
        {
          provide: FileHelperService,
          useValue: fileHelperServiceSpy
        },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: mockCustomer.id })
          }
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate'])
        }
      ]
    }).compileComponents();

    apiService = TestBed.inject(CustomerApiService) as jasmine.SpyObj<CustomerApiService>;
    fileHelperService = TestBed.inject(FileHelperService) as jasmine.SpyObj<FileHelperService>;
  }));

  // TODO: add tests to check data mapping from data into form fields

  it('component can be created', () => {
    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('initial data loaded and shown correctly', waitForAsync(() => {
    apiService.getCustomer.withArgs(mockCustomer.id).and.returnValue(of(mockCustomer));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();

    expect(component.customerData).toEqual(mockCustomer);

    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('[testId="customerIdText"]')).nativeElement.textContent).toBe('133');
    expect(fixture.debugElement.query(By.css('[testId="nameText"]')).nativeElement.textContent).toBe('Mustermann Max');

    const birthDateAge = moment(mockCustomer.birthDate).format('DD.MM.YYYY') + ' (' + moment().diff(mockCustomer.birthDate, 'years') + ')'
    expect(fixture.debugElement.query(By.css('[testId="birthDateAgeText"]')).nativeElement.textContent).toBe(birthDateAge);
    expect(fixture.debugElement.query(By.css('[testId="countryText"]')).nativeElement.textContent).toBe('Österreich');
    expect(fixture.debugElement.query(By.css('[testId="telephoneNumberText"]')).nativeElement.textContent).toBe('6644123123123');
    expect(fixture.debugElement.query(By.css('[testId="emailText"]')).nativeElement.textContent).toBe('max.mustermann@gmail.com');
    expect(fixture.debugElement.query(By.css('[testId="addressLine1Text"]')).nativeElement.textContent).toBe('Teststraße 123A, Stiege 1, Top 21');
    expect(fixture.debugElement.query(By.css('[testId="addressLine2Text"]')).nativeElement.textContent).toBe('1020 Wien');
    expect(fixture.debugElement.query(By.css('[testId="employerText"]')).nativeElement.textContent).toBe('test employer');
    expect(fixture.debugElement.query(By.css('[testId="incomeText"]')).nativeElement.textContent).toBe('1000 €');
    expect(fixture.debugElement.query(By.css('[testId="incomeDueText"]')).nativeElement.textContent).toBe('28.08.2023');
  }));

  it('printMasterdata', waitForAsync(() => {
    apiService.getCustomer.withArgs(mockCustomer.id).and.returnValue(of(mockCustomer));

    const response = new HttpResponse({
      status: 200,
      headers: new HttpHeaders(
        { 'Content-Disposition': 'inline; filename=test-name-1.pdf' }
      ),
      body: new ArrayBuffer(10)
    });
    apiService.generateMasterdataPdf.withArgs(mockCustomer.id).and.returnValue(of(response));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();

    component.printMasterdata();

    expect(fileHelperService.downloadFile).toHaveBeenCalledWith('test-name-1.pdf', new Blob([response.body], { type: 'application/pdf' }));
  }));

  it('editCustomer', waitForAsync(() => {
    apiService.getCustomer.withArgs(mockCustomer.id).and.returnValue(of(mockCustomer));

    const fixture = TestBed.createComponent(CustomerDetailComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();

    component.editCustomer();

    expect(router.navigate).toHaveBeenCalledWith(['/kunden/bearbeiten', mockCustomer.id]);
  }));

});
