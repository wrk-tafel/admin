import {Component, computed, inject, linkedSignal, signal} from '@angular/core';
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
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faEye, faEyeSlash, faKey, faUser} from '@fortawesome/free-solid-svg-icons';
import {visibleErrorMessages} from '../../util/signal-form-helper';
import {ConfigApiService} from '../../../api/config-api.service';

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
    MatIcon,
    FaIconComponent
  ]
})
export class LoginComponent {
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

  // Empty on production, set per deployment elsewhere. The only config this page can read: it runs
  // before anyone is logged in, so it goes to the public endpoint rather than /api/config.
  private readonly publicConfig = toSignal(this.configApiService.getPublicConfig(), {initialValue: null});
  readonly environmentLabel = computed(() => this.publicConfig()?.environmentLabel ?? '');

  public togglePasswordVisibility() {
    this.passwordVisible.update(value => !value);
  }

  // Browser autofill doesn't dispatch an `input` event, so the signal-forms model (and the
  // submit button's disabled state) would otherwise never learn a field got filled in. See
  // login.component.scss for the :-webkit-autofill animation this reacts to.
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
      } else if (loginResult.locked) {
        this.errorMessage.set('Konto vorübergehend gesperrt! Bitte versuchen Sie es später erneut.');
      } else {
        this.errorMessage.set('Anmeldung fehlgeschlagen!');
      }
    }).finally(() => {
      this.submitting.set(false);
    });
  }

  protected readonly visibleErrorMessages = visibleErrorMessages;
  protected readonly faUser = faUser;
  protected readonly faKey = faKey;
  protected readonly faEye = faEye;
  protected readonly faEyeSlash = faEyeSlash;
}
