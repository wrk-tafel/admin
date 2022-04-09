import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AddPersonCardComponent, AddPersonCardData } from './addperson-card.component';
import { v4 as uuidv4 } from 'uuid';

describe('AddPersonsCardComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [
        AddPersonCardComponent
      ],
      imports: [RouterTestingModule]
    }).compileComponents();
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(AddPersonCardComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  }));

  it('data filling and update is working', waitForAsync(() => {
    const fixture = TestBed.createComponent(AddPersonCardComponent);
    const component = fixture.componentInstance;
    const testData: AddPersonCardData = {
      uuid: uuidv4(),
      lastname: 'Mustermann',
      firstname: 'Max',
      birthDate: new Date(),
      income: 500
    }
    component.personData = testData;
    spyOn(component.dataUpdateEvent, 'emit');
    component.ngOnInit();

    expect(component.personForm.value).toEqual(testData);
    expect(component.personForm.valid).toBe(true);

    expect(component.lastname.value).toBe(testData.lastname);
    component.lastname.setValue('updated');
    fixture.detectChanges();
    expect(component.dataUpdateEvent.emit).toHaveBeenCalledWith(jasmine.objectContaining({
      lastname: 'updated'
    }));
  }));

});
