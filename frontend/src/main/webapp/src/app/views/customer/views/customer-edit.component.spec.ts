import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ModalModule } from 'ngx-bootstrap/modal';
import { CustomerEditComponent } from './customer-edit.component';

describe('CustomerEditComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        ModalModule.forRoot()
      ],
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

    component.updatedCustomerFormData();

    expect(component.saveDisabled).toBe(true);
  });

  it('updatePersonsData', () => {
    const fixture = TestBed.createComponent(CustomerEditComponent);
    const component = fixture.componentInstance;

    const existingData = { lastname: 'old' };
    component.additionalPersonsData[0] = existingData;
    expect(component.additionalPersonsData[0]).toEqual(existingData);

    component.updatedPersonsFormData();

    expect(component.saveDisabled).toEqual(true);
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
