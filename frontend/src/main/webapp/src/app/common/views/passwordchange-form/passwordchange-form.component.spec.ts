import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {PasswordChangeFormComponent} from './passwordchange-form.component';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {ChangePasswordResponse} from '../../../api/user-api.service';
import {provideRouter} from '@angular/router';
import {AuthenticationService} from '../../security/authentication.service';

describe('PasswordChangeFormComponent', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<PasswordChangeFormComponent>;
  let component: PasswordChangeFormComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        // AuthenticationService (needed for the live password-rule checklist's username check)
        // itself depends on Router - not otherwise exercised by this spec.
        provideRouter([]),
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

  it('changePassword should fill errorMessages correctly', () => {
    const errorResponse: ChangePasswordResponse = {
      message: 'ERROR 123',
      details: ['DETAIL 0', 'DETAIL 1']
    };

    component.passwordFormModel.set({
      currentPassword: 'CURR',
      newPassword: 'NEW',
      newRepeatedPassword: 'NEW'
    });

    component.changePassword().subscribe({error: () => undefined});

    const req = httpMock.expectOne('/users/change-password');
    req.flush(errorResponse, {status: 422, statusText: 'Unprocessable Entity'});
    httpMock.verify();

    expect(component.errorMessage()).toBe(errorResponse.message);
    expect(component.errorMessageDetails()).toEqual(errorResponse.details);
  });

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

  it('passwordForm validity reflects required fields and password match state', () => {
    // Empty form is invalid - required fields missing
    expect(component.passwordForm().valid()).toBe(false);

    // Filled but mismatched passwords - still invalid
    component.passwordFormModel.set({
      currentPassword: 'current123',
      newPassword: '12345678',
      newRepeatedPassword: '87654321'
    });
    expect(component.passwordForm().valid()).toBe(false);

    // Filled and matching passwords - valid
    component.passwordFormModel.set({
      currentPassword: 'current123',
      newPassword: '12345678',
      newRepeatedPassword: '12345678'
    });
    expect(component.passwordForm().valid()).toBe(true);
  });

  it('passwordRules are all unmet for an empty password', () => {
    expect(component.passwordRules().every(rule => !rule.met)).toBe(true);
  });

  it('passwordRules flag a too-short password only on the length rule', () => {
    component.passwordFormModel.set({...component.passwordFormModel(), newPassword: '1234567'});

    const rules = component.passwordRules();
    expect(rules[0].met).toBe(false); // length
    expect(rules[2].met).toBe(true); // no whitespace
    expect(rules[3].met).toBe(true); // no banned word
  });

  it('passwordRules flag whitespace and banned words', () => {
    component.passwordFormModel.set({...component.passwordFormModel(), newPassword: 'has tafel word'});

    const rules = component.passwordRules();
    expect(rules[0].met).toBe(true); // length
    expect(rules[2].met).toBe(false); // no whitespace
    expect(rules[3].met).toBe(false); // no banned word ("tafel")
  });

  it('passwordRules are all met for a compliant password', () => {
    component.passwordFormModel.set({...component.passwordFormModel(), newPassword: 'dummy-Passwort-42'});

    expect(component.passwordRules().every(rule => rule.met)).toBe(true);
  });

  it('passwordRules flag a password containing the current username', () => {
    TestBed.inject(AuthenticationService).userInfo.set({username: 'e2etest', permissions: []});
    component.passwordFormModel.set({...component.passwordFormModel(), newPassword: 'contains-e2etest-here'});

    const rules = component.passwordRules();
    expect(rules[1].met).toBe(false); // contains the username
  });

  it('passwordStrength is empty for an empty password and scored otherwise', () => {
    expect(component.passwordStrength().label).toBe('');

    component.passwordFormModel.set({...component.passwordFormModel(), newPassword: 'ab'});
    expect(component.passwordStrength().score).toBeGreaterThan(0);
    expect(component.passwordStrength().label).not.toBe('');

    component.passwordFormModel.set({...component.passwordFormModel(), newPassword: 'dummy-Passwort-42'});
    expect(component.passwordStrength().level).toBe('strong');
  });

  it('passwordStrength bar carries the severity class matching the level', () => {
    // The M2-only `color` input is a no-op under the M3 theme, so the bar's color coding rides on
    // these classes (styled in scss/components/mat-progress-bar.scss).
    const barSeverityClass = (newPassword: string): string | undefined => {
      component.passwordFormModel.set({...component.passwordFormModel(), newPassword});
      fixture.detectChanges();
      const bar: HTMLElement = fixture.nativeElement.querySelector('[testid="passwordStrengthBar"]');
      return Array.from(bar.classList).find(cssClass => cssClass.startsWith('progress-bar-'));
    };

    expect(barSeverityClass('abc')).toBe('progress-bar-danger');
    expect(barSeverityClass('passwort123')).toBe('progress-bar-warning');
    expect(barSeverityClass('dummy-Passwort-42')).toBe('progress-bar-success');
  });

});
