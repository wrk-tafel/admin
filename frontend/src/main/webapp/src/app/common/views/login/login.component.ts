import {Component, inject, linkedSignal, signal} from '@angular/core';
import {form, FormField, required} from '@angular/forms/signals';
import {ActivatedRoute, Router} from '@angular/router';
import {AuthenticationService} from '../../security/authentication.service';
import {toSignal} from '@angular/core/rxjs-interop';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardGroupComponent,
  ColComponent,
  ContainerComponent,
  InputGroupComponent,
  InputGroupTextDirective,
  RowComponent
} from '@coreui/angular';
import {IconDirective} from '@coreui/icons-angular';
import {TafelAutofocusDirective} from '../../directive/tafel-autofocus.directive';

@Component({
  selector: 'tafel-login',
  templateUrl: 'login.component.html',
  imports: [
    ContainerComponent,
    RowComponent,
    ColComponent,
    CardGroupComponent,
    CardComponent,
    CardBodyComponent,
    FormField,
    InputGroupComponent,
    InputGroupTextDirective,
    IconDirective,
    ButtonDirective,
    TafelAutofocusDirective
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

}
