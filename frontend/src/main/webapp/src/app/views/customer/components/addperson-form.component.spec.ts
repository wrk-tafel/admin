import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AddPersonFormComponent, CustomerAddPersonFormData } from './addperson-form.component';
import { v4 as uuidv4 } from 'uuid';
import * as moment from 'moment';

describe('AddPersonsFormComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        AddPersonFormComponent
      ],
      imports: [RouterTestingModule]
    }).compileComponents();
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(AddPersonFormComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  }));

  it('data filling and update is working', waitForAsync(() => {
    const fixture = TestBed.createComponent(AddPersonFormComponent);
    const component = fixture.componentInstance;
    const testData: CustomerAddPersonFormData = {
      uuid: uuidv4(),
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: moment().subtract(20, 'years').startOf('day').utc().toDate(),
      income: 500
    };

    component.personData = testData;
    spyOn(component.dataUpdatedEvent, 'emit');
    component.ngOnInit();

    expect(component.personForm.get('uuid').value).toBe(testData.uuid);
    expect(component.personForm.get('lastname').value).toBe(testData.lastname);
    expect(component.personForm.get('firstname').value).toBe(testData.firstname);
    expect(component.personForm.get('birthDate').value).toBe(moment(testData.birthDate).startOf('day').utc().format('YYYY-MM-DD'));
    expect(component.personForm.get('income').value).toBe(testData.income);

    expect(component.personForm.valid).toBe(true);

    expect(component.lastname.value).toBe(testData.lastname);
    component.lastname.setValue('updated');
    fixture.detectChanges();
    expect(component.dataUpdatedEvent.emit).toHaveBeenCalled();
  }));

});
