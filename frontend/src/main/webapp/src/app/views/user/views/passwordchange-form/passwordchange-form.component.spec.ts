import {ComponentFixture, fakeAsync, TestBed, waitForAsync} from '@angular/core/testing';
import {ModalModule} from 'ngx-bootstrap/modal';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {FormControl, FormGroup} from '@angular/forms';
import {ChangePasswordResponse} from '../../api/user-api.service';
import {PasswordChangeFormComponent} from "./passwordchange-form.component";

describe('PasswordChangeFormComponent', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<PasswordChangeFormComponent>;
  let component: PasswordChangeFormComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ModalModule.forRoot(),
        HttpClientTestingModule
      ],
      declarations: [
        PasswordChangeFormComponent
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PasswordChangeFormComponent);
    component = fixture.componentInstance;
  }));

  it('should create the component', waitForAsync(() => {
    expect(component).toBeTruthy();
  }));

  it('validateNewAndRepeatedPasswords should return null on matching values', waitForAsync(() => {
    const validator = component.validateNewAndRepeatedPasswords;

    const testForm = new FormGroup({
      newPassword: new FormControl('12345'),
      newRepeatedPassword: new FormControl('12345')
    });

    const result = validator(testForm);

    expect(result).toBe(null);
  }));

  it('validateNewAndRepeatedPasswords should return object when values dont match', waitForAsync(() => {
    const validator = component.validateNewAndRepeatedPasswords;

    const testForm = new FormGroup({
      newPassword: new FormControl('12345'),
      newRepeatedPassword: new FormControl('67890')
    });

    const result = validator(testForm);

    expect(result).toEqual({passwordsDontMatch: true});
  }));

  it('changePassword should fill errorMessages correctly', waitForAsync(() => {
    const errorResponse: ChangePasswordResponse = {
      message: 'ERROR 123',
      details: ['DETAIL 0', 'DETAIL 1']
    };

    component.currentPassword.setValue('CURR');
    component.newPassword.setValue('NEW');

    component.changePassword();

    const req = httpMock.expectOne('/users/change-password');
    req.flush(errorResponse, {status: 422, statusText: 'Unprocessable Entity'});
    httpMock.verify();

    expect(component.errorMessage).toBe(errorResponse.message);
    expect(component.errorMessageDetails).toEqual(errorResponse.details);
  }));

  it('changePassword should set successMessage', fakeAsync(() => {
    component.currentPassword.setValue('CURR');
    component.newPassword.setValue('NEW');
    component.errorMessage = 'error-msg';
    component.errorMessageDetails = ['detail0', 'detail1'];

    component.changePassword();

    const req = httpMock.expectOne('/users/change-password');
    req.flush({});
    httpMock.verify();

    expect(component.errorMessage).toBe(null);
    expect(component.errorMessageDetails).toEqual(null);
    expect(component.successMessage).toBe('Passwort erfolgreich geändert!');
  }));

});
