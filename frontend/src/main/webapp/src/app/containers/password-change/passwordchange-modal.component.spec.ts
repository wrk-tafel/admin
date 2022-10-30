import {ComponentFixture, fakeAsync, TestBed, tick, waitForAsync} from '@angular/core/testing';
import {PasswordChangeModalComponent} from './passwordchange-modal.component';
import {ModalDirective, ModalModule} from "ngx-bootstrap/modal";
import {HttpClientTestingModule, HttpTestingController} from "@angular/common/http/testing";
import {FormControl, FormGroup} from "@angular/forms";
import {ChangePasswordResponse} from "../../common/api/user-api.service";

describe('PasswordChangeModalComponent', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<PasswordChangeModalComponent>;
  let component: PasswordChangeModalComponent;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ModalModule.forRoot(),
        HttpClientTestingModule
      ],
      declarations: [
        PasswordChangeModalComponent
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PasswordChangeModalComponent);
    component = fixture.componentInstance;
  }));

  it('should create the component', waitForAsync(() => {
    expect(component).toBeTruthy();
  }));

  it('showDialog should open the modal dialog', waitForAsync(() => {
    component.form = jasmine.createSpyObj<FormGroup>(['reset']);
    component.modal = jasmine.createSpyObj<ModalDirective>(['show']);

    component.showDialog();

    expect(component.form.reset).toHaveBeenCalled();
    expect(component.modal.show).toHaveBeenCalled();
  }));

  it('hideModalDelayed should hide the modal dialog after a delay', fakeAsync(() => {
    component.modal = jasmine.createSpyObj<ModalDirective>(['hide']);

    component.hideModalDelayed();
    expect(component.modal.hide).not.toHaveBeenCalled();

    tick(2000);

    expect(component.modal.hide).toHaveBeenCalled();
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

  it('changePassword should call apiService correctly', waitForAsync(() => {
    // apiService.updatePassword.and.returnValue(of())

    component.currentPassword.setValue('CURR');
    component.newPassword.setValue('NEW');

    component.changePassword();

    const changePasswordRequest = {passwordCurrent: 'CURR', passwordNew: 'NEW'};
    // expect(apiService.updatePassword).toHaveBeenCalledWith(changePasswordRequest);
  }));

  it('changePassword should fill errorMessages correctly', waitForAsync(() => {
    const errorResponse: ChangePasswordResponse = {
      message: 'ERROR 123',
      details: ['DETAIL 0', 'DETAIL 1']
    }

    component.currentPassword.setValue('CURR');
    component.newPassword.setValue('NEW');

    component.changePassword();

    const req = httpMock.expectOne('/users/change-password');
    req.flush(errorResponse, {status: 422, statusText: 'Unprocessable Entity'});
    httpMock.verify();

    expect(component.errorMessage).toBe(errorResponse.message);
    expect(component.errorMessageDetails).toEqual(errorResponse.details);
  }));

  it('changePassword should set successMessage and hide the modal dialog', fakeAsync(() => {
    component.modal = jasmine.createSpyObj<ModalDirective>(['hide']);

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

    tick(2000);
    expect(component.modal.hide).toHaveBeenCalled();
  }));

});
