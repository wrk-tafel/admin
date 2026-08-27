import {Component, computed, ElementRef, inject, linkedSignal, signal, viewChild} from '@angular/core';
import {NgOptimizedImage} from '@angular/common';
import {form, FormField, required} from '@angular/forms/signals';
import {ActivatedRoute, Params, Router} from '@angular/router';
import {AuthenticationService} from '../../security/authentication.service';
import {toSignal} from '@angular/core/rxjs-interop';
import {TafelAutofocusDirective} from '../../directive/tafel-autofocus.directive';
import {MatCard, MatCardContent} from '@angular/material/card';
import {MatButton} from '@angular/material/button';
import {MatError, MatFormField, MatInput, MatLabel, MatPrefix, MatSuffix} from '@angular/material/input';
import {MatIcon} from '@angular/material/icon';
import {visibleErrorMessages} from '../../util/signal-form-helper';
import {ConfigApiService} from '../../../api/config-api.service';
import {registerSvgIcons} from '../../util/svg-icon.util';
import personIcon from '@material-symbols/svg-400/outlined/person-fill.svg';
import keyIcon from '@material-symbols/svg-400/outlined/key-fill.svg';
import visibilityIcon from '@material-symbols/svg-400/outlined/visibility-fill.svg';
import visibilityOffIcon from '@material-symbols/svg-400/outlined/visibility_off-fill.svg';
import warningIcon from '@material-symbols/svg-400/outlined/warning-fill.svg';

@Component({
  selector: 'tafel-login',
  templateUrl: 'login.component.html',
  styleUrls: ['login.component.scss'],
  imports: [
    NgOptimizedImage,
    FormField,
    TafelAutofocusDirective,
    MatCard,
    MatCardContent,
    MatButton,
    MatInput,
    MatFormField,
    MatLabel,
    MatError,
    MatPrefix,
    MatSuffix,
    MatIcon
  ]
})
export class LoginComponent {
  private readonly registerIcons = registerSvgIcons({
    person: personIcon,
    key: keyIcon,
    visibility: visibilityIcon,
    visibility_off: visibilityOffIcon,
    warning: warningIcon
  });

  private readonly authenticationService = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly configApiService = inject(ConfigApiService);

  // Form model as a signal
  loginFormModel = signal({
    username: '',
    password: ''
  });

  // Create form with validators using schema function
  loginForm = form(this.loginFormModel, (schemaPath) => {
    required(schemaPath.username, {message: 'Benutzername ist erforderlich'});
    required(schemaPath.password, {message: 'Passwort ist erforderlich'});
  });

  // Convert route params to signal
  private readonly routeParams = toSignal(this.route.params, {initialValue: {} as Params});

  // Error message derived from route params via linkedSignal.
  // Writable: can be manually set on login failure, resets when route params change.
  errorMessage = linkedSignal<string | null>(() => {
    const errorType = this.routeParams()['errorType'];
    if (errorType === 'abgelaufen') {
      return 'Sitzung abgelaufen! Bitte erneut anmelden.';
    } else if (errorType === 'fehlgeschlagen') {
      return 'Zugriff nicht erlaubt!';
    }
    return null;
  });

  passwordVisible = signal(false);
  submitting = signal(false);
  capsLockActive = signal(false);

  private readonly usernameInput = viewChild<ElementRef<HTMLInputElement>>('usernameInput');

  // Empty on production, set per deployment elsewhere. The only config this page can read: it runs
  // before anyone is logged in, so it goes to the public endpoint rather than /api/config.
  private readonly publicConfig = toSignal(this.configApiService.getPublicConfig(), {initialValue: null});
  readonly environmentLabel = computed(() => this.publicConfig()?.environmentLabel ?? '');

  public togglePasswordVisibility() {
    this.passwordVisible.update(value => !value);
  }

  // Browser autofill doesn't dispatch an `input` event, so the signal-forms model (which the
  // submit handler reads the entered values from) would otherwise never learn a field got filled
  // in. See login.component.scss for the :-webkit-autofill animation this reacts to.
  //
  // Chrome also withholds the autofilled value from `input.value` until the user makes a
  // genuine gesture anywhere on the page (a privacy measure), so reading it immediately here
  // would just read an empty string - wait for that gesture, then sync.
  public onAutofill(event: AnimationEvent, field: 'username' | 'password') {
    if (event.animationName !== 'tafel-autofill-detect') {
      return;
    }
    const input = event.target as HTMLInputElement;
    const sync = () => {
      document.removeEventListener('pointerdown', sync, true);
      document.removeEventListener('keydown', sync, true);
      setTimeout(() => this.loginForm[field]().value.set(input.value));
    };
    document.addEventListener('pointerdown', sync, {capture: true});
    document.addEventListener('keydown', sync, {capture: true});
  }

  // Shared terminals and external keyboards make an active Caps Lock a frequent, silent cause of a
  // "wrong" password - both keydown and keyup are wired to this so the hint also disappears the
  // moment Caps Lock is turned back off, not just when it's turned on.
  public onPasswordKeyEvent(event: KeyboardEvent) {
    if (typeof event.getModifierState === 'function') {
      this.capsLockActive.set(event.getModifierState('CapsLock'));
    }
  }

  public onSubmit(event: Event) {
    // Plain native <form> (signal-forms has no NgForm/ngSubmit directive to do this for us) -
    // without preventDefault the browser would GET-submit the page with the fields as query params.
    event.preventDefault();
    this.login();
  }

  public async login() {
    this.loginForm().markAsTouched();
    if (!this.loginForm().valid()) {
      return;
    }

    const username = this.loginForm.username().value();
    const password = this.loginForm.password().value();

    this.submitting.set(true);
    return this.authenticationService.login(username, password).then((loginResult) => {
      if (loginResult.successful) {
        if (loginResult.passwordChangeRequired) {
          this.router.navigate(['/login/passwortaendern']);
        } else {
          this.router.navigate(['uebersicht']);
        }
        return;
      }

      if (loginResult.locked) {
        this.errorMessage.set(this.buildLockedMessage());
      } else if (loginResult.rateLimited) {
        this.errorMessage.set('Zu viele Anmeldeversuche! Bitte warten Sie einen Moment und versuchen Sie es erneut.');
      } else if (loginResult.serverUnreachable) {
        this.errorMessage.set('Server nicht erreichbar! Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.');
      } else {
        this.errorMessage.set('Anmeldung fehlgeschlagen!');
      }

      // The role="alert" banner announces the error on its own; moving focus back to the
      // username field and selecting its content means the next attempt starts with one
      // keystroke instead of several clicks/tabs.
      const input = this.usernameInput()?.nativeElement;
      input?.focus();
      input?.select();
    }).finally(() => {
      this.submitting.set(false);
    });
  }

  // Tells a locked-out user what to actually do (wait, or ask an administrator) instead of just
  // naming the state - and, since the wait is however long the backend is actually configured for
  // (`security.loginAttempts.lockoutDurationInSeconds`, served as accountLockoutDurationInSeconds
  // on the public config), never quotes a duration that has drifted from the real one.
  private buildLockedMessage(): string {
    const durationInSeconds = this.publicConfig()?.accountLockoutDurationInSeconds;
    const waitHint = durationInSeconds
      ? `in ca. ${formatDurationInMinutes(durationInSeconds)} erneut`
      : 'später erneut';
    return `Konto vorübergehend gesperrt! Bitte versuchen Sie es ${waitHint} oder wenden Sie sich an eine`
      + ' Administratorin/einen Administrator.';
  }

  protected readonly visibleErrorMessages = visibleErrorMessages;
}

function formatDurationInMinutes(durationInSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(durationInSeconds / 60));
  return minutes === 1 ? '1 Minute' : `${minutes} Minuten`;
}
