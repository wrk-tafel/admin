import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { ModalModule } from 'ngx-bootstrap/modal';
import { AddPersonFormComponent } from '../components/addperson-form.component';
import { CustomerFormComponent } from '../components/customer-form.component';
import { CustomerEditComponent } from './customer-edit.component';

describe('CustomerEditComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        ReactiveFormsModule,
        ModalModule.forRoot()
      ],
      declarations: [
        CustomerEditComponent,
        CustomerFormComponent,
        AddPersonFormComponent
      ]
    }).compileComponents();
  }));

  it('initial checks', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[testid=nopersons-label]')).toBeTruthy();
  });

  it('addNewPerson', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    component.saveDisabled = false;

    expect(component.saveDisabled).toBe(false);
    expect(component.additionalPersonsData.length).toBe(0);

    fixture.nativeElement.querySelector('[testid=addperson-button]').click();
    fixture.detectChanges();

    expect(component.additionalPersonsData.length).toBe(1);
    expect(component.additionalPersonsData[0].uuid).toBeDefined();
    expect(fixture.nativeElement.querySelector('[testid=nopersons-label]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[testid=personcard-0]')).toBeTruthy();
    expect(component.saveDisabled).toBe(true);
  });

  it('removePerson', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    component.saveDisabled = false;

    expect(component.saveDisabled).toBe(false);

    const existingData = { lastname: 'old' };
    component.additionalPersonsData[0] = existingData;
    expect(component.additionalPersonsData.length).toBe(1);

    fixture.detectChanges();
    fixture.nativeElement.querySelector('[testid=remove-personcard-0]').click();

    fixture.detectChanges();
    expect(component.additionalPersonsData.length).toBe(0);
    expect(fixture.nativeElement.querySelector('[testid=nopersons-label]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[testid=personcard-0]')).toBeNull();
    expect(component.saveDisabled).toBe(true);
  });

  it('trackBy', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    const testUuid = 'test-UUID';

    const trackingId = component.trackBy(0, { uuid: testUuid });

    expect(trackingId).toBe(testUuid);
  });

  it('updateCustomerFormData', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;

    expect(component.customerData).toBe(undefined);

    component.updatedCustomerFormData();

    expect(component.saveDisabled).toBe(true);
  });

  it('updatePersonsFormData', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;

    const existingData = { lastname: 'old' };
    component.additionalPersonsData[0] = existingData;
    expect(component.additionalPersonsData[0]).toEqual(existingData);

    component.updatedPersonsFormData();

    expect(component.saveDisabled).toEqual(true);
  });

  it('validate - forms invalid', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.saveDisabled = false;

    expect(component.saveDisabled).toBe(false);

    component.validate();

    expect(component.saveDisabled).toEqual(true);
    expect(component.errorMessage).toBe('Bitte Eingaben überprüfen!');
  });

});
