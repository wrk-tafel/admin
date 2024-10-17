import {Component, inject, OnInit} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {AuthenticationService} from '../../security/authentication.service';
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
import {NgIf, NgOptimizedImage} from '@angular/common';

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
    NgIf,
    ButtonDirective
  ],
  standalone: true
})
export class LoginComponent implements OnInit {
  errorMessage: string;
  loginForm = new FormGroup({
    username: new FormControl<string>(null, Validators.required),
    password: new FormControl<string>(null, Validators.required)
  });
  private readonly authenticationService = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const errorType: string = params['errorType'];
      if (errorType === 'abgelaufen') {
        this.errorMessage = 'Sitzung abgelaufen! Bitte erneut anmelden.';
      } else if (errorType === 'fehlgeschlagen') {
        this.errorMessage = 'Zugriff nicht erlaubt!';
      }
    });
  }

  public async login() {
    const username = this.loginForm.get('username').value;
    const password = this.loginForm.get('password').value;

    const loginResult = await this.authenticationService.login(username, password);
    if (loginResult.successful) {
      if (loginResult.passwordChangeRequired) {
        await this.router.navigate(['/login/passwortaendern']);
      } else {
        await this.router.navigate(['uebersicht']);
      }
    } else {
      this.errorMessage = 'Anmeldung fehlgeschlagen!';
    }
  }

}
