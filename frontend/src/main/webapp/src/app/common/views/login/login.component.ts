import {Component, inject, linkedSignal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
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
  FormDirective,
  InputGroupComponent,
  InputGroupTextDirective,
  RowComponent
} from '@coreui/angular';
import {IconDirective} from '@coreui/icons-angular';
import {NgOptimizedImage} from '@angular/common';
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
        ReactiveFormsModule,
        InputGroupComponent,
        InputGroupTextDirective,
        IconDirective,
        NgOptimizedImage,
        FormDirective,
        ButtonDirective,
        TafelAutofocusDirective
    ]
})
export class LoginComponent {
  private readonly authenticationService = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  form = this.fb.group({
    username: this.fb.control<string>(null, Validators.required),
    password: this.fb.control<string>(null, Validators.required)
  });

  // Convert route params to signal
  private readonly routeParams = toSignal(this.route.params, { initialValue: {} });

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
    const username = this.form.get('username').value;
    const password = this.form.get('password').value;

    const loginResult = await this.authenticationService.login(username, password);
    if (loginResult.successful) {
      if (loginResult.passwordChangeRequired) {
        await this.router.navigate(['/login/passwortaendern']);
      } else {
        await this.router.navigate(['uebersicht']);
      }
    } else {
      this.errorMessage.set('Anmeldung fehlgeschlagen!');
    }
  }

}
