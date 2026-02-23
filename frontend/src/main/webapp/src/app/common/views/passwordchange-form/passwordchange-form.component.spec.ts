import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {PasswordChangeFormComponent} from './passwordchange-form.component';
import {ModalModule} from '@coreui/angular';
import {provideHttpClient} from '@angular/common/http';

describe('PasswordChangeFormComponent', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<PasswordChangeFormComponent>;
  let component: PasswordChangeFormComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ModalModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PasswordChangeFormComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('form should be invalid when passwords dont match', () => {
    // Set password fields
    component.passwordFormModel.set({
      currentPassword: 'current123',
      newPassword: '12345678',
      newRepeatedPassword: '87654321'
    });

    // Mark fields as touched to trigger validation
    component.passwordForm.newPassword().markAsTouched();
    component.passwordForm.newRepeatedPassword().markAsTouched();

    // Check that newRepeatedPassword has passwordsDontMatch error
    const errors = component.passwordForm.newRepeatedPassword().errors();
    const passwordMismatchError = errors.find(e => e.kind === 'passwordsDontMatch');

    expect(passwordMismatchError).toBeDefined();
    expect(passwordMismatchError?.message).toBe('Passwort-Wiederholung stimmt nicht überein!');
  });

  it('form should be valid when passwords match', () => {
    // Set matching passwords
    component.passwordFormModel.set({
      currentPassword: 'current123',
      newPassword: '12345678',
      newRepeatedPassword: '12345678'
    });

    // Mark fields as touched
    component.passwordForm.currentPassword().markAsTouched();
    component.passwordForm.newPassword().markAsTouched();
    component.passwordForm.newRepeatedPassword().markAsTouched();

    // Check no passwordsDontMatch error exists
    const errors = component.passwordForm.newRepeatedPassword().errors();
    const passwordMismatchError = errors.find(e => e.kind === 'passwordsDontMatch');

    expect(passwordMismatchError).toBeUndefined();
  });

  // TODO fix test
  /*
  it('changePassword should fill errorMessages correctly'(() => {
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
  });
   */

  it('changePassword should set successMessage and clear errorMessages', () => {
    component.passwordFormModel.set({
      currentPassword: 'CURR',
      newPassword: 'NEW',
      newRepeatedPassword: 'NEW'
    });
    component.successMessage.set('success-msg');
    component.errorMessage.set('error-msg');
    component.errorMessageDetails.set(['detail0', 'detail1']);

    component.changePassword().subscribe();

    const req = httpMock.expectOne('/users/change-password');
    req.flush({});
    httpMock.verify();

    expect(component.errorMessage()).toBe(null);
    expect(component.errorMessageDetails()).toEqual([]);
    expect(component.successMessage()).toBe('Passwort erfolgreich geändert!');
  });

  it('reset clears messages and form state', () => {
    component.passwordFormModel.set({
      currentPassword: 'CURR',
      newPassword: 'NEW',
      newRepeatedPassword: 'NEW-REPEATED'
    });
    component.successMessage.set('succ-msg');
    component.errorMessage.set('error-msg');
    component.errorMessageDetails.set(['detail0', 'detail1']);

    component.reset();

    expect(component.passwordForm.currentPassword().value()).toBe('');
    expect(component.passwordForm.newPassword().value()).toBe('');
    expect(component.passwordForm.newRepeatedPassword().value()).toBe('');
    expect(component.successMessage()).toBe(null);
    expect(component.errorMessage()).toBe(null);
    expect(component.errorMessageDetails()).toEqual([]);
  });

  // TODO test: isValid --> form.true/false/undefined

});
