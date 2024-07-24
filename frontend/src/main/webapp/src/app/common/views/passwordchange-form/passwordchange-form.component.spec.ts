import {ComponentFixture, TestBed, waitForAsync} from '@angular/core/testing';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {FormControl, FormGroup} from '@angular/forms';
import {PasswordChangeFormComponent} from './passwordchange-form.component';
import {ModalModule} from '@coreui/angular';

describe('PasswordChangeFormComponent', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<PasswordChangeFormComponent>;
  let component: PasswordChangeFormComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ModalModule,
        HttpClientTestingModule
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PasswordChangeFormComponent);
    component = fixture.componentInstance;
  }));

  it('should create the component', waitForAsync(() => {
    expect(component).toBeTruthy();
  }));

  it('validateNewAndRepeatedPasswords should return null on matching values', waitForAsync(() => {
    const validator = component.validateNewAndRepeatedPasswords();

    const testForm = new FormGroup({
      newPassword: new FormControl('12345'),
      newRepeatedPassword: new FormControl('12345')
    });

    const result = validator(testForm);

    expect(result).toBe(null);
  }));

  it('validateNewAndRepeatedPasswords should return object when values dont match', waitForAsync(() => {
    const validator = component.validateNewAndRepeatedPasswords();

    const testForm = new FormGroup({
      newPassword: new FormControl('12345'),
      newRepeatedPassword: new FormControl('67890')
    });

    const result = validator(testForm);

    expect(result).toEqual({passwordsDontMatch: true});
  }));

  // TODO fix test
  /*
  it('changePassword should fill errorMessages correctly', waitForAsync(() => {
    const errorResponse: ChangePasswordResponse = {
      message: 'ERROR 123',
      details: ['DETAIL 0', 'DETAIL 1']
    };

    component.currentPassword.setValue('CURR');
    component.newPassword.setValue('NEW');

    component.changePassword().subscribe();

    const req = httpMock.expectOne('/users/change-password');
    req.flush(errorResponse, {status: 422, statusText: 'Unprocessable Entity'});
    httpMock.verify();

    expect(component.errorMessage).toBe(errorResponse.message);
    expect(component.errorMessageDetails).toEqual(errorResponse.details);
  }));
   */

  it('changePassword should set successMessage and clear errorMessages', waitForAsync(() => {
    component.currentPassword.setValue('CURR');
    component.newPassword.setValue('NEW');
    component.successMessage = 'success-msg';
    component.errorMessage = 'error-msg';
    component.errorMessageDetails = ['detail0', 'detail1'];

    component.changePassword().subscribe();

    const req = httpMock.expectOne('/users/change-password');
    req.flush({});
    httpMock.verify();

    expect(component.errorMessage).toBe(null);
    expect(component.errorMessageDetails).toEqual(null);
    expect(component.successMessage).toBe('Passwort erfolgreich geändert!');
  }));

  it('reset clears messages and form state', waitForAsync(() => {
    component.currentPassword.setValue('CURR');
    component.newPassword.setValue('NEW');
    component.newRepeatedPassword.setValue('NEW-REPEATED');
    component.successMessage = 'succ-msg';
    component.errorMessage = 'error-msg';
    component.errorMessageDetails = ['detail0', 'detail1'];

    component.reset();

    expect(component.currentPassword.value).toBe(null);
    expect(component.newPassword.value).toBe(null);
    expect(component.newRepeatedPassword.value).toBe(null);
    expect(component.successMessage).toBe(null);
    expect(component.errorMessage).toBe(null);
    expect(component.errorMessageDetails).toBe(null);
  }));

  // TODO test: isValid --> form.true/false/undefined

});
