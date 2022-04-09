import { TestBed, waitForAsync } from '@angular/core/testing';
import { isFunctionOrConstructorTypeNode } from 'typescript';
import { CustomerEditComponent } from './customer-edit.component';

describe('CustomerEditComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        CustomerEditComponent
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

  it('updateCustomerFormData', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;

    expect(component.customerData).toBe(undefined);

    const updatedData = { lastname: 'updated' };
    component.updateCustomerFormData(updatedData);

    expect(component.customerData).toEqual(updatedData);
  });

  it('updatePersonsData', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;

    const existingData = { lastname: 'old' };
    component.additionalPersonsData[0] = existingData;
    expect(component.additionalPersonsData[0]).toEqual(existingData);

    const updatedData = { lastname: 'updated' };
    component.updatePersonsData(0, updatedData);

    expect(component.additionalPersonsData[0]).toEqual(updatedData);
  });

  it('addNewPerson', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;

    expect(component.additionalPersonsData.length).toBe(0);

    fixture.nativeElement.querySelector('[testid=addperson-button]').click();
    fixture.detectChanges();

    expect(component.additionalPersonsData.length).toBe(1);
    expect(component.additionalPersonsData[0].uuid).toBeDefined();
    expect(fixture.nativeElement.querySelector('[testid=nopersons-label]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[testid=personcard-0]')).toBeTruthy();
  });

  it('removePerson', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;

    const existingData = { lastname: 'old' };
    component.additionalPersonsData[0] = existingData;
    expect(component.additionalPersonsData.length).toBe(1);

    fixture.detectChanges();
    fixture.nativeElement.querySelector('[testid=remove-personcard-0]').click();

    fixture.detectChanges();
    expect(component.additionalPersonsData.length).toBe(0);
    expect(fixture.nativeElement.querySelector('[testid=nopersons-label]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[testid=personcard-0]')).toBeNull();
  });

  it('trackBy', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;
    const testUuid = 'test-UUID';

    const trackingId = component.trackBy(0, { uuid: testUuid });

    expect(trackingId).toBe(testUuid);
  });

});
