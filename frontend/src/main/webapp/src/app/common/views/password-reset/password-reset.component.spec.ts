import type {MockedObject} from 'vitest';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, provideRouter} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {By} from '@angular/platform-browser';
import {of, throwError} from 'rxjs';
import {ForgotPasswordComponent} from './forgot-password.component';
import {ResetPasswordComponent} from './reset-password.component';
import {PasswordResetApiService} from '../../../api/password-reset-api.service';

describe('password reset pages', () => {
  let api: MockedObject<PasswordResetApiService>;

  function configure(fragment: string | null) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {provide: ActivatedRoute, useValue: {snapshot: {fragment}}},
        {
          provide: PasswordResetApiService,
          useValue: {
            requestReset: vi.fn().mockName('PasswordResetApiService.requestReset').mockReturnValue(of(undefined)),
            confirmReset: vi.fn().mockName('PasswordResetApiService.confirmReset').mockReturnValue(of(undefined))
          }
        }
      ]
    });
    api = TestBed.inject(PasswordResetApiService) as MockedObject<PasswordResetApiService>;
  }

  const byTestId = (fixture: {debugElement: any}, testId: string) =>
    fixture.debugElement.query(By.css(`[testid="${testId}"]`));

  describe('ForgotPasswordComponent', () => {
    beforeEach(() => configure(null));

    it('does not send an empty request', () => {
      const fixture = TestBed.createComponent(ForgotPasswordComponent);
      fixture.detectChanges();

      fixture.componentInstance.onSubmit(new Event('submit'));

      expect(api.requestReset).not.toHaveBeenCalled();
    });

    it('sends the trimmed identifier and shows the same answer whatever it was', () => {
      const fixture = TestBed.createComponent(ForgotPasswordComponent);
      fixture.componentInstance.model.set({identifier: '  max  '});
      fixture.detectChanges();

      fixture.componentInstance.onSubmit(new Event('submit'));
      fixture.detectChanges();

      expect(api.requestReset).toHaveBeenCalledWith('max', expect.anything());
      expect(byTestId(fixture, 'forgotPasswordSent')).not.toBeNull();
    });

    it('says so when the request could not be sent', () => {
      api.requestReset.mockReturnValue(throwError(() => new HttpErrorResponse({status: 0})));
      const fixture = TestBed.createComponent(ForgotPasswordComponent);
      fixture.componentInstance.model.set({identifier: 'max'});

      fixture.componentInstance.onSubmit(new Event('submit'));
      fixture.detectChanges();

      expect(byTestId(fixture, 'forgotPasswordError')).not.toBeNull();
      expect(fixture.componentInstance.sent()).toBe(false);
    });
  });

  describe('ResetPasswordComponent', () => {
    it('shows the invalid-link state when the link carries no token', () => {
      configure(null);
      const fixture = TestBed.createComponent(ResetPasswordComponent);
      fixture.detectChanges();

      expect(byTestId(fixture, 'resetPasswordInvalidLink')).not.toBeNull();
    });

    it('sends nothing when the page loads', () => {
      configure('token=abc');
      const fixture = TestBed.createComponent(ResetPasswordComponent);
      fixture.detectChanges();

      expect(api.confirmReset).not.toHaveBeenCalled();
      expect(byTestId(fixture, 'newPassword')).not.toBeNull();
    });

    it('does not send passwords that do not match', () => {
      configure('token=abc');
      const fixture = TestBed.createComponent(ResetPasswordComponent);
      fixture.componentInstance.model.set({newPassword: 'aSecret123', newRepeatedPassword: 'aSecret124'});

      fixture.componentInstance.onSubmit(new Event('submit'));

      expect(api.confirmReset).not.toHaveBeenCalled();
    });

    it('sends the token from the fragment with the new password', () => {
      configure('token=abc');
      const fixture = TestBed.createComponent(ResetPasswordComponent);
      fixture.componentInstance.model.set({newPassword: 'aSecret123', newRepeatedPassword: 'aSecret123'});

      fixture.componentInstance.onSubmit(new Event('submit'));
      fixture.detectChanges();

      expect(api.confirmReset).toHaveBeenCalledWith('abc', 'aSecret123', expect.anything());
      expect(byTestId(fixture, 'resetPasswordDone')).not.toBeNull();
    });

    it('shows the invalid-link state when the link is gone', () => {
      configure('token=abc');
      api.confirmReset.mockReturnValue(throwError(() => new HttpErrorResponse({status: 410})));
      const fixture = TestBed.createComponent(ResetPasswordComponent);
      fixture.componentInstance.model.set({newPassword: 'aSecret123', newRepeatedPassword: 'aSecret123'});

      fixture.componentInstance.onSubmit(new Event('submit'));
      fixture.detectChanges();

      expect(byTestId(fixture, 'resetPasswordInvalidLink')).not.toBeNull();
    });

    it('shows why the password policy refused the password', () => {
      configure('token=abc');
      api.confirmReset.mockReturnValue(throwError(() => new HttpErrorResponse({
        status: 400,
        error: {message: 'Das neue Passwort ist ungültig!', details: ['Mindestlänge: 8']}
      })));
      const fixture = TestBed.createComponent(ResetPasswordComponent);
      fixture.componentInstance.model.set({newPassword: 'aSecret123', newRepeatedPassword: 'aSecret123'});

      fixture.componentInstance.onSubmit(new Event('submit'));
      fixture.detectChanges();

      expect(byTestId(fixture, 'resetPasswordError').nativeElement.textContent).toContain('Das neue Passwort ist ungültig!');
      expect(byTestId(fixture, 'resetPasswordError-detail-0').nativeElement.textContent).toContain('Mindestlänge: 8');
    });
  });
});
