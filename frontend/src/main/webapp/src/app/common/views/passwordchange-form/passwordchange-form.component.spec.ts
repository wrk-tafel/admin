import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {PasswordChangeFormComponent} from './passwordchange-form.component';
import {provideHttpClient, withXhr} from '@angular/common/http';
import {ChangePasswordResponse} from '../../../api/user-api.service';
import {AppConfig, ConfigApiService} from '../../../api/config-api.service';
import {BehaviorSubject} from 'rxjs';

describe('PasswordChangeFormComponent', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<PasswordChangeFormComponent>;
  let component: PasswordChangeFormComponent;
  let config: BehaviorSubject<AppConfig | null>;

  beforeEach(() => {
    config = new BehaviorSubject<AppConfig | null>({
      version: '1.0.0',
      buildTime: 'unknown',
      scannerFolderEnabled: false,
      passwordRules: {minLength: 8, maxLength: 50, forbiddenWords: ['tafel']}
    });
    const configApiServiceSpy = {
      observeConfig: vi.fn().mockName('ConfigApiService.observeConfig').mockReturnValue(config.asObservable())
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {provide: ConfigApiService, useValue: configApiServiceSpy}
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

  it('validates the length against the rules the deployment is configured with', () => {
    config.next({
      version: '1.0.0',
      buildTime: 'unknown',
      scannerFolderEnabled: false,
      passwordRules: {minLength: 12, maxLength: 14, forbiddenWords: []}
    });

    component.passwordFormModel.set({
      currentPassword: 'current123',
      newPassword: '12345678',
      newRepeatedPassword: '12345678'
    });

    const tooShortError = component.passwordForm.newPassword().errors().find(e => e.kind === 'minLength');
    expect(tooShortError?.message).toBe('Passwort zu kurz (Limit: 12)');

    component.passwordFormModel.set({
      currentPassword: 'current123',
      newPassword: '123456789012345',
      newRepeatedPassword: '123456789012345'
    });

    const tooLongError = component.passwordForm.newPassword().errors().find(e => e.kind === 'maxLength');
    expect(tooLongError?.message).toBe('Passwort zu lang (Limit: 14)');
  });

  it('leaves the length to the backend when the config is unavailable', () => {
    config.next(null);

    component.passwordFormModel.set({
      currentPassword: 'current123',
      newPassword: 'ab',
      newRepeatedPassword: 'ab'
    });

    expect(component.passwordForm.newPassword().errors()).toEqual([]);
    expect(component.passwordForm().valid()).toBe(true);
  });

  it('lists the configured rules and follows a config change', () => {
    fixture.detectChanges();

    const lengthRule = () => fixture.nativeElement.querySelector('[testid="passwordRules-length"]')?.textContent?.trim();
    const forbiddenWords = () => fixture.nativeElement.querySelector('[testid="passwordRules-forbiddenWords"]')?.textContent;

    expect(lengthRule()).toBe('Mindestens 8 Zeichen, maximal 50 Zeichen');
    expect(forbiddenWords()).toContain('tafel');

    config.next({
      version: '1.0.0',
      buildTime: 'unknown',
      scannerFolderEnabled: false,
      passwordRules: {minLength: 12, maxLength: 40, forbiddenWords: []}
    });
    fixture.detectChanges();

    expect(lengthRule()).toBe('Mindestens 12 Zeichen, maximal 40 Zeichen');
    // nothing forbidden means the rule isn't stated at all
    expect(fixture.nativeElement.querySelector('[testid="passwordRules-forbiddenWords"]')).toBeNull();
  });

  it('states no rules while the config has not arrived', () => {
    config.next(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[testid="passwordRules"]')).toBeNull();
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

});
