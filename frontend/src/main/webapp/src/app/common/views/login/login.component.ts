import {Component, inject, linkedSignal, signal} from '@angular/core';
import {form, FormField, required} from '@angular/forms/signals';
import {ActivatedRoute, Router} from '@angular/router';
import {AuthenticationService} from '../../security/authentication.service';
import {toSignal} from '@angular/core/rxjs-interop';
import {TafelAutofocusDirective} from '../../directive/tafel-autofocus.directive';
import {MatCard, MatCardContent} from "@angular/material/card";
import {MatButton} from "@angular/material/button";
import {MatInput} from "@angular/material/input";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faKey, faUser} from "@fortawesome/free-solid-svg-icons";

@Component({
  selector: 'tafel-login',
  templateUrl: 'login.component.html',
  imports: [
    FormField,
    TafelAutofocusDirective,
    MatCard,
    MatCardContent,
    MatButton,
    MatInput,
    FaIconComponent
  ]
})
export class LoginComponent {
  private readonly authenticationService = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

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
  private readonly routeParams = toSignal(this.route.params, {initialValue: {}});

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

  public async login() {
    const username = this.loginForm.username().value();
    const password = this.loginForm.password().value();

    this.authenticationService.login(username, password).then((loginResult) => {
      if (loginResult.successful) {
        if (loginResult.passwordChangeRequired) {
          this.router.navigate(['/login/passwortaendern']);
        } else {
          this.router.navigate(['uebersicht']);
        }
      } else {
        this.errorMessage.set('Anmeldung fehlgeschlagen!');
      }
    });
  }

  protected readonly faUser = faUser;
  protected readonly faKey = faKey;
}
