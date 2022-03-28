import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CustomerFormComponent, CustomerFormData } from './customer-form.component';

describe('CustomerFormComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        CustomerFormComponent
      ],
      imports: [RouterTestingModule]
    }).compileComponents();
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(CustomerFormComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  }));

  it('initial data filled', waitForAsync(() => {
    const component = new CustomerFormComponent();
    const testData: CustomerFormData = {
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: new Date(),
      city: 'Wien',
      door: '1',
      employer: 'WRK',
      houseNumber: '123A',
      income: 123.0,
      incomeDue: new Date(),
      nationality: 'Österreich',
      postalCode: 123,
      stair: '1',
      street: 'Testgasse'
    }
    component.initialData = testData;
    component.ngOnInit();

    expect(component.customerForm.value).toEqual(testData);
    expect(component.customerForm.valid).toBe(true);
  }));

  it('prefilled postalCode and city', waitForAsync(() => {
    const component = new CustomerFormComponent();

    expect(component.customerForm.get('postalCode').value).toBe(1030);
    expect(component.customerForm.get('city').value).toBe('Wien');
    expect(component.customerForm.valid).toBe(false);
  }));

});
