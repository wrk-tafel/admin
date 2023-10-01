import {TestBed, waitForAsync} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {UserFormComponent} from './user-form.component';
import {ReactiveFormsModule} from '@angular/forms';
import {CardModule, ColComponent, InputGroupComponent, RowComponent} from '@coreui/angular';
import {UserData} from '../../../api/user-api.service';

describe('UserFormComponent', () => {
  const mockUser: UserData = {
    id: 0,
    personnelNumber: '0000',
    username: 'username',
    firstname: 'first',
    lastname: 'last',
    enabled: true,
    passwordChangeRequired: false
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        ReactiveFormsModule,
        InputGroupComponent,
        CardModule,
        RowComponent,
        ColComponent
      ],
      declarations: [
        UserFormComponent
      ],
      providers: []
    }).compileComponents();
  }));

  it('should create the component', waitForAsync(() => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  }));

  it('data filling works', waitForAsync(() => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;

    spyOn(component.userDataChange, 'emit');
    component.ngOnInit();
    component.userData = mockUser;

    fixture.detectChanges();

    // TODO check dom elements - makes more sense
    /*
    fixture.detectChanges();

    fixture.whenStable().then(() => {
      expect(fixture.debugElement.query(By.css('[testid="idInput"]')).nativeElement.value).toBe(testData.id);
    });
    */

    expect(component.id.value).toBe(mockUser.id);
    expect(component.username.value).toBe(mockUser.username);
    expect(component.personnelNumber.value).toBe(mockUser.personnelNumber);
    expect(component.lastname.value).toBe(mockUser.lastname);
    expect(component.firstname.value).toBe(mockUser.firstname);
    expect(component.enabled.value).toBe(mockUser.enabled);
    expect(component.passwordChangeRequired.value).toBe(mockUser.passwordChangeRequired);
  }));

  it('data update works', waitForAsync(() => {
    const fixture = TestBed.createComponent(UserFormComponent);
    const component = fixture.componentInstance;

    spyOn(component.userDataChange, 'emit');
    component.ngOnInit();
    component.userData = mockUser;

    const updatedUsername = 'updated';
    const updatedPersonnelNumber = 'updated';
    const updatedLastname = 'updated';
    const updatedFirstname = 'updated';
    const updatedEnabled = false;
    const updatedPasswordChangeRequired = true;

    component.personnelNumber.setValue(updatedPersonnelNumber);
    component.username.setValue(updatedUsername);
    component.lastname.setValue(updatedLastname);
    component.firstname.setValue(updatedFirstname);
    component.enabled.setValue(updatedEnabled);
    component.passwordChangeRequired.setValue(updatedPasswordChangeRequired);

    fixture.detectChanges();

    expect(component.userDataChange.emit).toHaveBeenCalledWith(jasmine.objectContaining({
      personnelNumber: updatedPersonnelNumber,
      username: updatedUsername,
      lastname: updatedLastname,
      firstname: updatedFirstname,
      enabled: updatedEnabled,
      passwordChangeRequired: updatedPasswordChangeRequired
    }));
  }));

});
